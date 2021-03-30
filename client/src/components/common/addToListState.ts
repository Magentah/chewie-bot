type NoListState = {
    state: undefined;
};

type AddedToListState = {
    state: "success";
};

type AddingToListState = {
    state: "progress";
};

type FailedAddToListState = {
    state: "failed";
    message: string;
};

export type AddToListState = NoListState | AddedToListState | AddingToListState | FailedAddToListState;
