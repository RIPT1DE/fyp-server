export function eventToPromise<
	A extends any[],
  E extends string,
	T extends { once(evname: E, cb: (...args: A) => void): void }
>(source: T, event: E): Promise<A> {
	return new Promise((res) => {
		source.once(event, (...args) => res(args));
	});
}
