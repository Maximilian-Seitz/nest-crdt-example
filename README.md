# Nested CRDT Example

Example implementation for the `nest-crdt-tools` package.

Starts multiple nodes locally, each in their own process,
connecting them via an encrypted TCP-connection.
Each node then creates a local CRDT with a name shared by each copy,
adding its own CRDT as a member of the shared object.

Files containing unique data to each node are then read and the data
is added to the node's CRDT.
Some nodes can be assigned to crash during this process,
which will stop them for a period of time during the simulation.

At the end of the simulation, each node will wait for some time
before evaluating their copies of every CRDT.
The results of this evaluation are compared between every non-faulty node,
checking them for consistency.

The `data` folder contains a file defining the nodes in the system,
and files detailing what data should be created at each node locally.


## Building

To build this project, run `npm install` and then `npm run build`
to compile the TypeScript project.


## Execution

Execute this project by running `dist/index.js` with node,
adding the node-id for every node that should be simulated
as a command-line argument, followed by a truthy value,
if this node should simulate a failure, and a falsy value,
in case this node should run correctly.

So, as an example
`node . Node8081 "" Node8082 "" Node8083 "" Node8084 fail`
will run 4 nodes (node-IDs can be found in `data/nodes.json`),
simulating 3 correctly, and the fourth with a failure.

The nodes will wait until every node was started,
will then create their data, and wait some time,
before showing the results of the simulation.
