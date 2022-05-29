import { defaultTypes } from "nest-crdt"
import { CRDTManager } from "nest-crdt-tools"

import {
	ReliableMessageDistributor
} from "nest-crdt-tools/broadcast"

import {
	Network,
	EncryptedTCPNetwork,
	TCPNode
} from "nest-crdt-tools/network"
import {
	CrashingNetwork
} from "./error"

import { sleep, readJSONFile, writeJSONFile } from "./util"

import { SimulationResult, simulationResultFilePath } from "./SimulationResults"


async function simulateNode(id: string, shouldFail: boolean, iterations?: number): Promise<SimulationResult> {
	const nodes = readJSONFile<Record<string, TCPNode>>('data/nodes.json')
	const data = readJSONFile<Array<string>>(`data/measurements/${id}.json`)
	
	const network: Network<TCPNode> = new EncryptedTCPNetwork(
		id,
		nodes[id],
		`data/privateKeys/${id}`,
		nodeId => `data/publicKeys/${nodeId}`
	)
	
	const crashingNetwork = new CrashingNetwork<TCPNode>(id, network)
	
	const broadcast = new ReliableMessageDistributor(
		id,
		nodes,
		crashingNetwork
	)
	
	const crdtManager = new CRDTManager(
		defaultTypes,
		broadcast
	)
	
	await broadcast.init()
	
	console.log(`Started ${id}!`)
	
	const sharedSet = crdtManager.get('sharedSet', 'g-set')
	const ownSet = crdtManager.get('set of: ' + id, 'g-set')
	
	await sharedSet.add({
		owner: id,
		containedSimulatedFailure: shouldFail,
		values: ownSet
	})
	
	for (let i = 0; i < (iterations || 1); i++) {
		// Turn off communication for some iterations, if a failure is configured in the command line arguments
		crashingNetwork.isRunning = !shouldFail || (i < 200) || (i > 500)
		
		for (const value of data) {
			await ownSet.add(`${value} (${i})`)
			await sleep(20)
		}
	}
	
	await sleep(5000)
	
	const finalValue: Array<any> = []
	
	sharedSet.value().forEach(value => {
		value['values'] = [...value['values'].value()]
		finalValue.push(value)
	})
	
	await broadcast.disconnect()
	
	return {
		id,
		hadFailure: shouldFail,
		finalValue
	}
}


async function main(args: Array<string>): Promise<void> {
	if (args.length >= 4) {
		const id = args[2]
		const isFailing = !!args[3]
		const iterations = - -(args[4] || "0")
		
		const simulationResult = await simulateNode(id, isFailing, iterations)
		
		writeJSONFile<SimulationResult>(simulationResultFilePath(id), simulationResult)
	}
}


main(process.argv).then(() => {})

