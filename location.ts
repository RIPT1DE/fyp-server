import {
	BehaviorSubject,
	combineLatest,
	concat,
	defer,
	exhaustMap,
	ignoreElements,
	map,
	of,
	shareReplay,
	switchMap,
	timer,
} from "rxjs";
import { readFile } from "fs/promises";
import { runGA } from "./GA";
import { Socket } from "socket.io";

enum CarInstruction {
	RED = 0,
	YELLOW = 1,
	GREEN = 2,
}

const SECONDS_PER_TIMESTEP = 5;

const carlocations$ = new BehaviorSubject([] as { x: number; y: number }[]);

const geneticSolution$ = carlocations$.pipe(
	exhaustMap((cars) => {
		return defer(async () => {
			let content = JSON.parse(
				await readFile("data.json", { encoding: "utf-8" })
			);
			content.allCars = cars;
			const solution = await runGA(content);
			return solution;
		}).pipe(
			switchMap((solution) => {
				return concat(
					of(solution),
					timer(solution.n_timesteps * SECONDS_PER_TIMESTEP * 1000).pipe(
						ignoreElements()
					)
				);
			})
		);
	}),
	shareReplay({
		bufferSize: 1,
		refCount: true,
	})
);

const currentTimeStep$ = new BehaviorSubject(1);

export function getIndividualCarData(socket: Socket) {
	return combineLatest([
		geneticSolution$,
		currentTimeStep$,
		carlocations$,
	]).pipe(
		map(([solution, timestep, locations]) => {
			const lane = getCarLane(locations, socket.id);
			const open = solution.data[getDataIndex(solution, timestep, lane)] == 1;
			if (open) {
				return CarInstruction.GREEN;
			} else {
				if (solution.data[getDataIndex(solution, timestep + 1, lane)]) {
					return CarInstruction.YELLOW;
				}
				return CarInstruction.RED;
			}
		})
	);
}

function getDataIndex(data: any, timestep: number, lane: number) {
	return lane * data.n_timesteps + timestep;
}

const carLanes = new Map<string, number>();

function getCarLane(
	carlocations: { x: number; y: number }[],
	carId: string
): number {
	return carLanes.get(carId) ?? 0;
}

export function setTimestep(step: number) {
	currentTimeStep$.next(step);
}

export function setCarLane(id: string, lane: number) {
	carLanes.set(id, lane);
	currentTimeStep$.next(currentTimeStep$.value);
}

//initialize the car locations at startup
readFile("data.json", { encoding: "utf-8" }).then((data) => {
	const content = JSON.parse(data);
	carlocations$.next(content.allCars);
});
