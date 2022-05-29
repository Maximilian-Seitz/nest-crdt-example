import { readFileSync, writeFileSync, existsSync, rmSync, mkdirSync } from "fs"


export function emptyDirectory(path: string): void {
	if (existsSync(path)) {
		rmSync(path, { recursive: true })
	}
	mkdirSync(path)
}

export function fileExists(filename: string): boolean {
	return existsSync(filename)
}

export function readJSONFile<T = any>(filename: string): T {
	return <T>JSON.parse(readFileSync(filename).toString())
}

export function writeJSONFile<T = any>(filename: string, content: T): void {
	writeFileSync(filename, JSON.stringify(content))
}

export function sleep(ms) {
	return new Promise((resolve) => {
		setTimeout(resolve, ms)
	})
}

export function haveSameElementsBy<T>(
	listA: Array<T>,
	listB: Array<T>,
	isSame: (elemA: T, elemB: T) => boolean
) {
	return listA.every(expectedElement =>
		listB.some(presentElement =>
			isSame(presentElement, expectedElement)
		)
	) &&
		listB.every(expectedElement =>
			listA.some(presentElement =>
				isSame(presentElement, expectedElement)
			)
		)
}
