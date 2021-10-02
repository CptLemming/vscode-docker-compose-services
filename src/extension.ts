// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { load } from 'js-yaml';

class TreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(label, collapsibleState);
		this.description = "Stopped";
		this.contextValue = "stopped"; // stopped | started

		this.iconPath = new vscode.ThemeIcon('debug-stop', new vscode.ThemeColor('debugIcon.stopForeground'));
  }
}

class TreeItemProvider implements vscode.TreeDataProvider<TreeItem> {
	private composefileLocation: string | null;
	private services: null | Record<string, any> = null;
	private _onDidChangeTreeData: vscode.EventEmitter<TreeItem | undefined | null | void> = new vscode.EventEmitter<TreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<TreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

	constructor(composefileLocation?: string) {
		this.composefileLocation = TreeItemProvider.getComposeFile(composefileLocation);
		this.loadServices();
	}

	getTreeItem(element: TreeItem): vscode.TreeItem {
    return element;
  }

	getChildren(element?: TreeItem): Thenable<TreeItem[]> {
    if (element || this.services == null) {
			return Promise.resolve([]);
    } else {
      return Promise.resolve(Object.keys(this.services).map(service => new TreeItem(
				service,
				vscode.TreeItemCollapsibleState.None
			)));
    }
  }

	static getComposeFile(composefileLocation?: string | null): string | null {
		const composeFile = composefileLocation || "docker-compose.yml";

		let lookupLocation: string | null = null;

		(vscode.workspace.workspaceFolders || []).forEach(folder => {
			const fileName = path.resolve(path.join(folder.uri.fsPath, composeFile));
			if (fs.existsSync(fileName)) {
				lookupLocation = fileName;
			}
		});

		return lookupLocation;
	}

	loadServices() {
		let doc: null | Record<string, any> = null;

		if (this.composefileLocation) {
			try {
				doc = load(fs.readFileSync(this.composefileLocation, 'utf8')) as any;
			} catch (e) {
				console.error("ERR", e);
			}
		}

		this.services = doc?.services;
	}

  refresh(): void {
		this.loadServices();
    this._onDidChangeTreeData.fire();
  }
}

export function activate(context: vscode.ExtensionContext) {
	const composefileLocation: string | undefined = vscode.workspace.getConfiguration('dockerComposeServices').get("composeLocation");

	const treeProvider = new TreeItemProvider(composefileLocation);
	vscode.window.registerTreeDataProvider(
		'dockerComposeServices',
		treeProvider
	);

	context.subscriptions.push(vscode.commands.registerCommand('dockerComposeServices.refresh', () => {
		vscode.window.withProgress(
			{
				location: vscode.ProgressLocation.Notification,
				title: 'Reloading docker compose file..',
				cancellable: false,
			},
			async () => {
				treeProvider.refresh();
		 }
		)
	}));
	context.subscriptions.push(vscode.commands.registerCommand('dockerComposeServices.startEntry', (treeItem: TreeItem) => {
		vscode.tasks.executeTask(new vscode.Task(
			{ type: 'shell' },
			vscode.TaskScope.Workspace,
			`Compose : ${treeItem.label}`,
			'Docker',
			new vscode.ShellExecution(`docker compose up ${treeItem.label}`),
			[]
		));
	}));
	context.subscriptions.push(vscode.commands.registerCommand('dockerComposeServices.stopEntry', (treeItem: TreeItem) => {
		vscode.tasks.executeTask(new vscode.Task(
			{ type: 'shell' },
			vscode.TaskScope.Workspace,
			`Compose : stop ${treeItem.label}`,
			'Docker',
			new vscode.ShellExecution(`docker compose stop ${treeItem.label}`),
			[]
		));
	}));
	context.subscriptions.push(vscode.commands.registerCommand('dockerComposeServices.killEntry', (treeItem: TreeItem) => {
		vscode.tasks.executeTask(new vscode.Task(
			{ type: 'shell' },
			vscode.TaskScope.Workspace,
			`Compose : kill ${treeItem.label}`,
			'Docker',
			new vscode.ShellExecution(`docker compose kill ${treeItem.label}`),
			[]
		));
	}));
	context.subscriptions.push(vscode.commands.registerCommand('dockerComposeServices.startService', () => {
		vscode.window.showInformationMessage('Start service');
	}));
}

// this method is called when your extension is deactivated
export function deactivate() {}
