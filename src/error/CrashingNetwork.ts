import { MessageReceiver, Network } from "nest-crdt-tools/network"

/**
 * A wrapper for a <code>Network</code>, which allows communication to other nodes
 * over the network to be intercepted, simulating a node which has been disconnected.
 * Requires an original network to intercept communication with.
 * Communication can be toggled, allowing simulation of scenarios where a node
 * is disconnected and reconnected to the network.
 *
 * @param Node The type representing a <code>Node</code> in the original <code>Network</code>.
 */
export class CrashingNetwork<Node> implements Network<Node> {
	
	private readonly ownId: string
	private readonly originalNetwork: Network<Node>
	
	public isRunning: boolean = true
	
	constructor(ownId: string, originalNetwork: Network<Node>) {
		this.ownId = ownId
		this.originalNetwork = originalNetwork
	}
	
	async registerNode(id: string, node: Node): Promise<void> {
		await this.originalNetwork.registerNode(id, node)
	}
	
	async registerReceiver(topic: string, receive: MessageReceiver): Promise<void> {
		await this.originalNetwork.registerReceiver(topic, async (senderId, message) => {
			if (this.isRunning || senderId == this.ownId) {
				await receive(senderId, message)
			}
		})
	}
	
	async sendMessage(targetId: string, topic: string, message: any): Promise<void> {
		if (this.isRunning || targetId == this.ownId) {
			await this.originalNetwork.sendMessage(targetId, topic, message)
		}
	}
	
	async stop(): Promise<void> {
		this.isRunning = false
		await this.originalNetwork.stop()
	}
	
}
