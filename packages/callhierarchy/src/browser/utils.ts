/*
 * Copyright (C) 2018 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { Location, Range } from 'vscode-languageserver-types';

/**
 * Test if `otherRange` is in `range`. If the ranges are equal, will return true.
 */
export function containsRange(range: Range, otherRange: Range): boolean {
    if (otherRange.start.line < range.start.line || otherRange.end.line < range.start.line) {
        return false;
    }
    if (otherRange.start.line > range.end.line || otherRange.end.line > range.end.line) {
        return false;
    }
    if (otherRange.start.line === range.start.line && otherRange.start.character < range.start.character) {
        return false;
    }
    if (otherRange.end.line === range.end.line && otherRange.end.character > range.end.character) {
        return false;
    }
    return true;
}

function sameStart(a: Range, b: Range): boolean {
    const pos1 = a.start;
    const pos2 = b.start;
    return pos1.line === pos2.line
        && pos1.character === pos2.character;
}

export function filterSame(locations: Location[], definition: Location): Location[] {
    return locations.filter(candidate => candidate.uri !== definition.uri
        || !sameStart(candidate.range, definition.range)
    );
}

export function filterUnique(locations: Location[]): Location[] {
    const result: Location[] = [];
    const set = new Set<string>();
    for (const location of locations) {
        const json = JSON.stringify(location);
        if (!set.has(json)) {
            set.add(json);
            result.push(location);
        }
    }
    return result;
}

export function startsAfter(a: Range, b: Range) {
    if (a.start.line > b.start.line) {
        return true;
    }
    if (a.start.line === b.start.line) {
        if (a.start.character > b.start.character) {
            return true;
        }
        if (a.start.character === b.start.character) {
            if (a.end.line > b.end.line) {
                return true;
            }
        }
    }
    return false;
}

export function isSame(a: Location, b: Location) {
    return a.uri === b.uri
        && a.range.start.line === b.range.start.line
        && a.range.end.line === b.range.end.line
        && a.range.start.character === b.range.start.character
        && a.range.end.character === b.range.end.character;
}
