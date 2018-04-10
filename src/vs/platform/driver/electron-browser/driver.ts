/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';

import { TPromise } from 'vs/base/common/winjs.base';
import { IDisposable } from 'vs/base/common/lifecycle';
import { IWindowDriver, IElement, WindowDriverChannel, WindowDriverRegistryChannelClient } from 'vs/platform/driver/common/driver';
import { IPCClient } from 'vs/base/parts/ipc/common/ipc';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';

function serializeElement(element: Element, recursive: boolean): IElement {
	const attributes = Object.create(null);

	for (let j = 0; j < element.attributes.length; j++) {
		const attr = element.attributes.item(j);
		attributes[attr.name] = attr.value;
	}

	const children = [];

	if (recursive) {
		for (let i = 0; i < element.children.length; i++) {
			children.push(serializeElement(element.children.item(i), true));
		}
	}

	return {
		tagName: element.tagName,
		className: element.className,
		textContent: element.textContent || '',
		attributes,
		children
	};
}

class WindowDriver implements IWindowDriver {

	constructor() { }

	click(selector: string, xoffset?: number, yoffset?: number): TPromise<void> {
		throw new Error('Method not implemented.');
	}

	doubleClick(selector: string): TPromise<void> {
		throw new Error('Method not implemented.');
	}

	move(selector: string): TPromise<void> {
		throw new Error('Method not implemented.');
	}

	async setValue(selector: string, text: string): TPromise<void> {
		const element = document.querySelector(selector);

		if (!element) {
			throw new Error('Element not found');
		}

		const inputElement = element as HTMLInputElement;
		inputElement.value = text;

		const event = new Event('input', { bubbles: true, cancelable: true });
		inputElement.dispatchEvent(event);
	}

	async getTitle(): TPromise<string> {
		return document.title;
	}

	async isActiveElement(selector: string): TPromise<boolean> {
		const element = document.querySelector(selector);
		return element === document.activeElement;
	}

	async getElements(selector: string, recursive: boolean): TPromise<IElement[]> {
		const query = document.querySelectorAll(selector);
		const result: IElement[] = [];

		for (let i = 0; i < query.length; i++) {
			const element = query.item(i);
			result.push(serializeElement(element, recursive));
		}

		return result;
	}

	async typeInEditor(selector: string, text: string): TPromise<void> {
		const element = document.querySelector(selector);

		if (!element) {
			throw new Error('Editor not found: ' + selector);
		}

		const textarea = element as HTMLTextAreaElement;

		console.log(textarea);

		const start = textarea.selectionStart;
		const newStart = start + text.length;
		const value = textarea.value;
		const newValue = value.substr(0, start) + text + value.substr(start);

		textarea.value = newValue;
		textarea.setSelectionRange(newStart, newStart);

		const event = new Event('input', { 'bubbles': true, 'cancelable': true });
		textarea.dispatchEvent(event);
	}

	selectorExecute<P>(selector: string, script: (elements: HTMLElement[], ...args: any[]) => P, ...args: any[]): TPromise<P> {
		return TPromise.wrapError(new Error('not implemented'));
	}
}

export async function registerWindowDriver(
	client: IPCClient,
	windowId: number,
	instantiationService: IInstantiationService
): TPromise<IDisposable> {
	const windowDriver = instantiationService.createInstance(WindowDriver);
	const windowDriverChannel = new WindowDriverChannel(windowDriver);
	client.registerChannel('windowDriver', windowDriverChannel);

	const windowDriverRegistryChannel = client.getChannel('windowDriverRegistry');
	const windowDriverRegistry = new WindowDriverRegistryChannelClient(windowDriverRegistryChannel);

	await windowDriverRegistry.registerWindowDriver(windowId);

	return client;
}