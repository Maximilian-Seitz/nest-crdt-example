
export function simulationResultFilePath(id: string): string {
	return `data/results/${id}.json`
}

export interface SimulationResult {
	id: string
	hadFailure: boolean
	finalValue: Array<SimulationResultValue>
}

export interface SimulationResultValue {
	owner: string,
	containedSimulatedFailure: boolean,
	values: Array<any>
}
