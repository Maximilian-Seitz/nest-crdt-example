import { fork } from "child_process"
import { fileExists, readJSONFile, haveSameElementsBy, emptyDirectory } from "./util"
import { SimulationResult, SimulationResultValue, simulationResultFilePath } from "./SimulationResults"
import { EncryptedTCPNetwork } from "nest-crdt-tools/network"


function runSimulations(
	nodes: Array<{ id: string, isFailing: boolean }>,
	iterations?: number
): Promise<Array<SimulationResult> | null> {
	return new Promise<Array<SimulationResult>>((resolve, _) => {
		let requiredDone = nodes.length
		
		const simulationResults: Array<SimulationResult> = []
		function finishSimulation(result: SimulationResult): void {
			simulationResults.push(result)
			if (simulationResults.length == requiredDone) {
				resolve(simulationResults)
			}
		}
		
		function fail(reason: any): void {
			requiredDone = -1
			console.log(reason)
			resolve(null)
		}
		
		for (const node of nodes) {
			fork(
				'dist/simulation',
				[
					node.id,
					node.isFailing ? "fail" : "",
					(iterations || 1) + ""
				]
			).on('close', _ => {
				let result: SimulationResult = null
				
				if (fileExists(simulationResultFilePath(node.id))) {
					result = readJSONFile<SimulationResult>(simulationResultFilePath(node.id))
				} else {
					console.error(`Simulation of node ${node.id} failed to produced an output!`)
				}
				
				finishSimulation(result)
			})
		}
	})
}


async function predictSimulationResultValue(
	nodes: Array<{ id: string, isFailing: boolean }>,
	iterations?: number
): Promise<Array<SimulationResultValue>> {
	return nodes.map(node => {
		return {
			owner: node.id,
			containedSimulatedFailure: node.isFailing,
			values: readJSONFile<Array<string>>(
				`data/measurements/${node.id}.json`
			).flatMap(
				value => Array.from(
					{length: (iterations || 1)},
					(_, i) => `${value} (${i})`
				)
			)
		}
	})
}


function isSameResultValue(
	valueA: SimulationResultValue,
	valueB: SimulationResultValue
): boolean {
	return valueA.owner == valueB.owner &&
		valueA.containedSimulatedFailure == valueB.containedSimulatedFailure &&
		haveSameElementsBy(valueA.values, valueB.values, (a, b) => (a == b))
}

function containSameResultValues(
	result: Array<SimulationResultValue>,
	expectedResult: Array<SimulationResultValue>,
	ignoreFailedNodes?: boolean
): boolean {
	return haveSameElementsBy(
		result,
		expectedResult,
		(value, expectedValue) => {
			return (ignoreFailedNodes && value.containedSimulatedFailure) ||
				isSameResultValue(value, expectedValue)
		}
	)
}

async function main(args: Array<string>): Promise<void> {
	if (args.length >= 4) {
		const nodes: Array<{ id: string, isFailing: boolean }> = []
		
		for (let i = 3; i < args.length; i += 2) {
			nodes.push({
				id: args[i - 1],
				isFailing: !!args[i]
			})
		}
		
		// Generate encryption keys
		emptyDirectory('data/privateKeys')
		emptyDirectory('data/publicKeys')
		for (const node of nodes) {
			EncryptedTCPNetwork.generateEncryptionKeyFiles(
				`data/privateKeys/${node.id}`,
				`data/publicKeys/${node.id}`
			)
		}
		
		emptyDirectory('data/results')
		
		const iterations = 200
		
		const expectedValue = await predictSimulationResultValue(nodes, iterations)
		const results = await runSimulations(nodes, iterations)
		
		//console.log(`Expected result:`, expectedValue)
		
		let representativeValue: Array<SimulationResultValue> = null
		
		if (results != null) {
			results.forEach(result => {
				if (result) {
					if (result.hadFailure) {
						console.log(`Ignored result of node ${result.id}, as it simulated a failure.`)
					} else {
						if (representativeValue && containSameResultValues(result.finalValue, representativeValue)) {
							console.log(`Resulting value from node ${result.id} is as expected!`)
						} else {
							if (containSameResultValues(result.finalValue, expectedValue, true)) {
								if (!representativeValue) {
									representativeValue = result.finalValue
									console.log(`Resulting value from node ${result.id} is as expected! Will be used as representative value!`)
								} else {
									console.log(`Resulting value from node ${result.id} is as expected, but not consistent with representative value!`)
								}
							} else {
								console.error(`Resulting value from node ${result.id} does not match expected value!`)
							}
						}
					}
				}
			})
		}
	} else {
		console.log("Not enough arguments! Require node IDs!")
	}
}


main(process.argv).then(() => console.log("Done!"))

