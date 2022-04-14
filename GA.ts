import { spawn } from "child_process";
import { eventToPromise } from "./utils";

export async function runGA(data: any) {
	const child_proc = spawn("./traffic");

	child_proc.stdin.write(JSON.stringify(data) + "\n" + "----");
  child_proc.stdin.end();

	child_proc.stdout.setEncoding("utf-8");

	let out = "";

	child_proc.stdout.on("data", (chunk) => {
		out += chunk;
	});

	await eventToPromise(child_proc.stdout, "end");

  return JSON.parse(out);
}
