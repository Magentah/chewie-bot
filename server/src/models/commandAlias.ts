export default interface ICommandAlias {
    id?: number;

    /**
     * An alias name of an existing command.
     */
    alias: string;

    /**
     * Existing command name.
     */
    commandName: string;

    /**
     * Arguments to pass to the aliased command.
     */
    commandArguments?: string[];
}
