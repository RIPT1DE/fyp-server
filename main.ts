import http from "http";
import { Server } from "socket.io";
import readline from "readline";
import { eventToPromise } from "./utils";

readline.emitKeypressEvents(process.stdin);

//server stuff:
const PORT = process.env.PORT || 3000;

const server = http.createServer();

const io = new Server(server);

server.listen(PORT, () => {
	console.log("listening on " + PORT);
});

//GA stuff:
const data = { chromosome: [] as number[], timesteps: 24 };

function getDataIndex(timestep: number, lane: number) {
	return lane * data.timesteps + timestep;
}

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
				break;

			case "left":
				curr_timestep--;
				if (curr_timestep < 0) {
					curr_timestep = 0;
				}
				break;

			case "l":
				const rl = readline.createInterface({
					input: process.stdin,
				});

				const [line] = await eventToPromise(rl, "line");

				curr_lane = Number.parseInt(line);

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

		const open = data.chromosome[getDataIndex(curr_timestep, curr_lane)] == 1;
		io.emit("data", {
			straight: open,
			left: false,
			right: false,
			back: false,
		});
	}
};

run();
