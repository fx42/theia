/*
 * Copyright (C) 2017-2018 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { CommandService } from '../../common';
import { LabelParser, LabelIcon } from '../label-parser';
import { injectable, inject } from 'inversify';
import { FrontendApplicationStateService } from '../frontend-application-state';
import { ReactWidget } from '../widgets/react-widget';
import { StatusBarView } from './status-bar-view';
import * as React from "react";
import { StatusBarElements } from './status-bar-elements';

export interface StatusBarLayoutData {
    entries: StatusBarEntryData[]
    backgroundColor?: string
}

export interface StatusBarEntryData {
    id: string;
    entry: StatusBarEntry
}

export interface StatusBarEntry {
    /**
     * For icons we use fontawesome. Get more information and the class names
     * here: http://fontawesome.io/icons/
     * To set a text with icon use the following pattern in text string:
     * $(fontawesomeClasssName)
     * To use animated icons use the following pattern:
     * $(fontawesomeClassName~typeOfAnimation)
     * Type of animation can be either spin or pulse.
     * Look here for more information to animated icons:
     * http://fontawesome.io/examples/#animated
     */
    text: string;
    alignment: StatusBarAlignment;
    tooltip?: string;
    command?: string;
    // tslint:disable-next-line:no-any
    arguments?: any[];
    priority?: number;
}

export enum StatusBarAlignment {
    LEFT, RIGHT
}

export interface StatusBarEntryAttributes {
    className?: string;
    title?: string;
    onClick?: () => void;
    onMouseOver?: () => void;
    onMouseOut?: () => void;
}

export const STATUSBAR_WIDGET_FACTORY_ID = 'statusBar';

export const StatusBar = Symbol('StatusBar');

export interface StatusBar {
    setBackgroundColor(color?: string): Promise<void>;
    setElement(id: string, entry: StatusBarEntry): Promise<void>;
    removeElement(id: string): Promise<void>;
}

@injectable()
export class StatusBarImpl extends ReactWidget implements StatusBar {

    protected backgroundColor: string | undefined;
    protected entries: Map<string, StatusBarEntry> = new Map();

    constructor(
        @inject(CommandService) protected readonly commands: CommandService,
        @inject(LabelParser) protected readonly entryService: LabelParser,
        @inject(FrontendApplicationStateService) protected readonly applicationStateService: FrontendApplicationStateService
    ) {
        super();
        delete this.scrollOptions;
        this.id = 'theia-statusBar';
    }

    protected get ready(): Promise<void> {
        return this.applicationStateService.reachedAnyState('initialized_layout', 'ready');
    }

    async setElement(id: string, entry: StatusBarEntry): Promise<void> {
        await this.ready;
        this.entries.set(id, entry);
        this.update();
    }

    async removeElement(id: string): Promise<void> {
        await this.ready;
        this.entries.delete(id);
        this.update();
    }

    async setBackgroundColor(color?: string): Promise<void> {
        await this.ready;
        this.internalSetBackgroundColor(color);
    }

    protected internalSetBackgroundColor(color?: string): void {
        this.backgroundColor = color;
        // tslint:disable-next-line:no-null-keyword
        this.node.style.backgroundColor = this.backgroundColor ? this.backgroundColor : null;
    }

    getLayoutData(): StatusBarLayoutData {
        const entries: StatusBarEntryData[] = [];
        this.entries.forEach((entry, id) => {
            entries.push({ id, entry });
        });
        return { entries, backgroundColor: this.backgroundColor };
    }

    setLayoutData(data: StatusBarLayoutData): void {
        if (data.entries) {
            data.entries.forEach(entryData => {
                this.entries.set(entryData.id, entryData.entry);
            });
            this.update();
        }
        this.internalSetBackgroundColor(data.backgroundColor);
    }

    protected render(): JSX.Element {
        const leftEntries: JSX.Element[] = [];
        const rightEntries: JSX.Element[] = [];
        const elements = Array.from(this.entries.values()).sort((left, right) => {
            const lp = left.priority || 0;
            const rp = right.priority || 0;
            return rp - lp;
        });
        elements.forEach(entry => {
            if (entry.alignment === StatusBarAlignment.LEFT) {
                leftEntries.push(this.renderElement(entry));
            } else {
                rightEntries.push(this.renderElement(entry));
            }
        });
        const leftElements: React.ReactElement<StatusBarElements> = <StatusBarElements key="statusbar-left-elements" alignment="left" entries={leftEntries} />;
        const rightElements: React.ReactElement<StatusBarElements> = <StatusBarElements key="statusbar-right-elements" alignment="right" entries={rightEntries} />;

        return <StatusBarView leftElements={leftElements} rightElements={rightElements} />;
    }

    protected createAttributes(entry: StatusBarEntry): StatusBarEntryAttributes {
        const attrs: StatusBarEntryAttributes = {};

        if (entry.command) {
            attrs.onClick = () => {
                if (entry.command) {
                    const args = entry.arguments || [];
                    this.commands.executeCommand(entry.command, ...args);
                }
            };
            attrs.className = 'element hasCommand';
        } else {
            attrs.className = 'element';
        }

        if (entry.tooltip) {
            attrs.title = entry.tooltip;
        }

        return attrs;
    }

    protected renderElement(entry: StatusBarEntry): JSX.Element {
        const childStrings = this.entryService.parse(entry.text);
        const children: JSX.Element[] = [];

        childStrings.forEach((val, idx) => {
            const key = entry.alignment + "-" + idx;
            if (!(typeof val === 'string') && LabelIcon.is(val)) {
                const classStr = `fa fa-${val.name} ${val.animation ? 'fa-' + val.animation : ''}`;
                children.push(<span className={classStr} key={key}></span>);
            } else {
                children.push(<span key={key}>{val}</span>);
            }
        });
        const elementInnerDiv = <div>{children}</div>;

        return React.createElement("div", this.createAttributes(entry), elementInnerDiv);
    }

}