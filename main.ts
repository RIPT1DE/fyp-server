import http from "http";
import { RemoteSocket, Server, Socket } from "socket.io";
import readline from "readline";
import { eventToPromise } from "./utils";
import { getIndividualCarData, setCarLane, setTimestep } from "./location";

readline.emitKeypressEvents(process.stdin);

//server stuff:
const PORT = process.env.PORT || 3000;

const server = http.createServer();

const io = new Server(server, {
	cors: {
		origin: "*",
	},
});

server.listen(PORT, () => {
	console.log("listening on " + PORT);
});

let joined = [] as Socket[];

io.on("connection", async (socket) => {
	const sub = getIndividualCarData(socket).subscribe((signal) => {
		socket.emit("data", { forward: signal });
	});

	socket.on("join", () => {
		joined.push(socket);

		socket.on("timestep", (timestep) => {
			setTimestep(timestep);
		});

		socket.on("carLane", ({id, lane}) => {
			setCarLane(id, lane);
		});
	});

	socket.on("disconnect", () => {
		sub.unsubscribe();
		joined = joined.filter((j) => j.id != socket.id);
	});

	let sockets = await io.fetchSockets();
	sockets = sockets.filter((s) => !joined.some((j) => j.id == s.id));
	joined.forEach((j) => {
		j.emit(
			"online",
			sockets.map((s) => s.id)
		);
	});
});

process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.setEncoding("utf-8");

let curr_timestep = 0;
let curr_lane = 0;

const run = async () => {
	while (true) {
		const [_, key] = await eventToPromise(process.stdin, "keypress");

		// console.log("got key ", key);

		if (!key) {
			continue;
		}

		//handle exit
		if (key.ctrl && key.name == "c") {
			process.exit(0);
		}

		switch (key.name) {
			case "right":
				curr_timestep++;
				setTimestep(curr_timestep);
				break;

			case "left":
				curr_timestep--;
				if (curr_timestep < 0) {
					curr_timestep = 0;
				}
				setTimestep(curr_timestep);
				break;

			case "l":
				const rl = readline.createInterface({
					input: process.stdin,
				});

				const [line] = await eventToPromise(rl, "line");

				curr_lane = Number.parseInt(line);

				const allSockets = await io.fetchSockets();
				if (allSockets.length > 0) {
					setCarLane(allSockets[0].id, curr_lane);
				}

				// rl.close();
				break;

			default:
				break;
		}

		console.log(
			"Current lane: ",
			curr_lane,
			"Current timestep: ",
			curr_timestep
		);
	}
};

run();
