export async function* asyncFilter<T>(iter: AsyncIterable<T>, filter: (item: T) => boolean) {
    for await (const i of iter)
        if (await filter(await i))
            yield i;
}

export async function* asyncMap<T, U>(iter: AsyncIterable<T>, map: (item: T) => U) {
    for await (const i of iter)
        yield await map(await i);
}

export async function* asyncUntil<T>(iter: AsyncIterable<T>, filter: (item: T) => boolean) {
    for await (const i of iter)
        if (!(await filter(await i)))
            yield i;
        else
            break;
}

export async function* asyncBatches<T>(iter: AsyncIterable<T>, size: number) {
    let count = 1;
    let list = Array.of<T>();
    for await (const i of iter) {
        list.push(await i);
        if (list.length == size) {
            //console.info("batching iterator", count++);
            yield list;
            list = Array.of<T>();
        }
    }
    if (list.length > 0)
        //console.info("batching iterator", count++);
        yield list;
}

export async function* asyncFlat<T, U>(iter: AsyncIterable<AsyncIterable<T>>) {
    for await (const item of iter)
        for await (const item2 of await item)
            yield await item2;
}

export async function asyncToArray<T, U>(iter: AsyncIterable<AsyncIterable<T>>) {
    let ar = [];
    for await (const item of iter)
        ar.push(item);
    return ar;
}

export async function asyncReduce<T, U>(iter: AsyncIterable<T>, func: (last: U, item: T) => U, initial: U) {
    for await (const i of iter) 
        initial = await func(initial, (await i));
    return initial;
}