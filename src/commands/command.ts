export abstract class Command {
    protected isInternalCommand: boolean = false;
    public execute(channel: string, ...args: any[]): void {
        // Empty
    }

    public isInternal(): boolean {
        return this.isInternalCommand;
    }
}
