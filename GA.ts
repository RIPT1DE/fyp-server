import { spawn } from "child_process";
import { stdout } from "process";
import { eventToPromise } from "./utils";

const SEP = "----";

export async function runGA(data: any): Promise<{
	data: number[];
	n_timesteps: number;
}> {
	const child_proc = spawn("./traffic");

	child_proc.stdin.write(JSON.stringify(data) + "\n" + SEP);
	child_proc.stdin.end();

	child_proc.stdout.setEncoding("utf-8");

	let out = "";

	child_proc.stdout.on("data", (chunk) => {
		out += chunk;
		stdout.write(chunk);
	});

	await eventToPromise(child_proc.stdout, "end");

	let parts = out.split(SEP);
	return JSON.parse(parts[1]);
}
