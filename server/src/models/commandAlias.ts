export default interface ICommandAlias {
    /**
     * An alias name of an existing command.
     */
    name: string;

    /**
     * Arguments to pass to the aliased command.
     */
    arguments: string;
}
