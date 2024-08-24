import React, { ReactNode, useContext, useEffect, useState } from "react";
import axios from "axios";
import MaterialTable from "@material-table/core";
import { UserLevel, UserLevels } from "../common/userLevel";
import {
    Alert, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, FormControlLabel, Grid, 
    InputAdornment, InputLabel, MenuItem, Select, SelectChangeEvent, Snackbar, SnackbarCloseReason, TextField }
from "@mui/material";
import { Launch, Chat, Settings } from "@mui/icons-material";
import { UserContext } from "../../contexts/userContext";
import { AddToListState } from "../common/addToListState";

enum CommandType {
    Text,
    Alias,
    System,
    TextGeneration
}

type RowData = { id?: number, commandName: string, content: string, type: CommandType, minUserLevel: number, useCount: number, useCooldown: boolean };

const CommandNameCell: React.FC<any> = (value: RowData) => {
    let icon = <Settings />;
    if (value.type === CommandType.Text || value.type === CommandType.TextGeneration) {
        icon = <Chat />;
    } else if (value.type === CommandType.Alias) {
        icon = <Launch />;
    }

    return <Grid container alignItems="center" spacing={1} wrap={"nowrap"}>
        <Grid item>
            {icon}
        </Grid>
        <Grid item>
            {value.commandName}
        </Grid>
    </Grid>
}

const CommandList: React.FC<any> = (props: any) => {
    const [commandlist, setCommandlist] = useState([] as RowData[]);
    const [editingCommand, setEditingCommand] = useState<RowData>();
    const [editCommandState, setEditCommandState] = useState<AddToListState>();
    const [userLevels, setUserLevels] = useState([] as UserLevel[]);
    const userContext = useContext(UserContext);

    useEffect(() => {
        axios.get("/api/commandlist").then((response) => {
            setCommandlist(response.data);
        });
    }, []);

    useEffect(() => {
        axios.get("/api/userLevels").then((response) => {
            setUserLevels(response.data);
        });
    }, []);

    const handleEditCommandClose = async (doSave: boolean) => {
        if (doSave && editingCommand) {
            setEditCommandState({state: "progress"});

            try {
                if (editingCommand.id) {
                    // Edit existing command
                    await axios.post("/api/commandlist", editingCommand);
                    const newList = [...commandlist];

                    const target = newList.find((el) => el.id === editingCommand.id);
                    if (target) {
                        const index = newList.indexOf(target);
                        newList[index] = editingCommand;
                        setCommandlist([...newList]);
                    }
                } else {
                    // Add new command
                    const result = await axios.post("/api/commandlist/add", editingCommand);
                    const newList = [...commandlist, result.data as RowData];
                    setCommandlist(newList);
                }

                setEditingCommand(undefined);
                setEditCommandState({state: "success"});
            } catch (error: any) {
                setEditCommandState({
                    state: "failed",
                    message: error.response.data.error.message
                });
            }
        } else {
            setEditingCommand(undefined);
        }
    };

    const handleClose = (event: any, reason: SnackbarCloseReason) => {
        setEditCommandState({state: undefined});
    };

    let editSongDialog;
    let songRequestStatusBar;
    if (editingCommand !== undefined) {
        songRequestStatusBar = <Grid item xs={12}>
            <Snackbar open={editCommandState?.state === "success"} autoHideDuration={4000} onClose={handleClose} key="edit-command-alert">
                <Alert onClose={(e) => handleClose(e, "clickaway")} severity="success">
                    Command saved successfully.
                </Alert>
            </Snackbar>
            { editCommandState?.state === "failed" ?
            <Snackbar open={true} autoHideDuration={4000} onClose={handleClose}>
                <Alert onClose={(e) => handleClose(e, "clickaway")} severity="error">
                    Command could not be saved: {editCommandState.message}
                </Alert>
            </Snackbar> : undefined}
        </Grid>;

        editSongDialog = <Dialog open={true} onClose={() => handleEditCommandClose(false)} key="command-edit-dialog">
            <form onSubmit={(event) => {event.preventDefault(); handleEditCommandClose(true);}}>
                <DialogTitle>{editingCommand?.id ? "Edit Command" : "Add Command"}</DialogTitle>
                <DialogContent>
                    <TextField autoFocus margin="dense" id="edit-title" label="Name" fullWidth variant="standard"
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">{"!"}</InputAdornment>
                            )}}
                        value={editingCommand?.commandName ?? ""} onChange={(e) => setEditingCommand({...editingCommand, commandName: e.target.value})} />
                    <TextField margin="dense" id="edit-content" label="Content" fullWidth variant="standard" multiline
                        helperText="Variables: uptime, time, date, count, username, userfromargument, useroruserfromargument, userlaststreaming, userfollowage, streamtotal[7|30], streamaverage7[7|30]"
                        value={editingCommand?.content ?? ""} rows={4} onChange={(e) => setEditingCommand({...editingCommand, content: e.target.value})} />
                    <TextField disabled={editingCommand?.type === CommandType.Alias} margin="dense" type="number" id="edit-count" label="Use count" fullWidth variant="standard"
                        value={editingCommand?.useCount ?? 0} onChange={(e) => setEditingCommand({...editingCommand, useCount: Number(e.target.value)})} />
                    <FormControlLabel style={{marginTop: "1.5em"}}
                        control={
                            <Checkbox id="edit-cooldown" checked={editingCommand?.useCooldown ? true : false}
                            disabled={editingCommand?.type === CommandType.Alias}
                            onChange={(e) => setEditingCommand({...editingCommand, useCooldown: e.target.checked})} />}
                        label="Cooldown enabled"
                    />
                    <FormControl fullWidth style={{ marginTop: 15 }}>
                        <InputLabel>Permissions required</InputLabel>
                        <Select
                            value={editingCommand?.minUserLevel ?? UserLevels.Viewer}
                            disabled={editingCommand?.type === CommandType.Alias}
                            onChange={(e: SelectChangeEvent<number>, child: ReactNode) => setEditingCommand({...editingCommand, minUserLevel: e.target.value as number})}>
                            {userLevels.map(e => <MenuItem key={`edit-level-item-${e.rank}`} value={e.rank}>{e.name}</MenuItem>)}
                        </Select>
                    </FormControl>
                    <FormControl fullWidth style={{ marginTop: 15 }}>
                        <InputLabel>Processing</InputLabel>
                        <Select
                            value={editingCommand?.type ?? CommandType.Text}
                            disabled={editingCommand?.type === CommandType.Alias}
                            onChange={(e: SelectChangeEvent<number>, child: ReactNode) => setEditingCommand({...editingCommand, type: e.target.value as number})}>
                            <MenuItem key={`edit-type-item-${1}`} value={0}>Plaintext</MenuItem>
                            <MenuItem key={`edit-type-item-${3}`} value={3}>AI prompt</MenuItem>
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions>
                    <Button disabled={!editingCommand?.commandName} onClick={() => handleEditCommandClose(true)}>Save</Button>
                    <Button onClick={() => handleEditCommandClose(false)}>Cancel</Button>
                </DialogActions>
            </form>
        </Dialog>;
    }

    return <div>
            {editSongDialog}
            {songRequestStatusBar}
            <MaterialTable key="command-edit-list"
                columns = {[
                    {
                        title: "Command", field: "commandName", defaultSort: "asc", filtering: false,
                        render: rowData => CommandNameCell(rowData),
                        validate: rowData => rowData.commandName !== "" && commandlist.filter(x => x.commandName === rowData.commandName && x.type === rowData.type && x.id !== rowData.id).length === 0
                    },
                    { title: "Content", field: "content", filtering: false },
                    { title: "Use count", field: "useCount", filtering: false, type: "numeric" },
                    {
                        title: "Has cooldown", field: "useCooldown", filtering: true, type: "boolean",
                        editable: (columnDef: any, rowData: RowData) => rowData?.type === CommandType.Text,
                        width: "10%"
                    },
                    { title: "Type", field: "type", editable: "onAdd", lookup: { 0: "Text", 1: "Alias", 2: "System", 3: "Generated text" }, defaultFilter: ["0", "1", "3"], initialEditValue: 0 },
                    { title: "Required permissions", field: "minUserLevel", editable: (columnDef: any, rowData: RowData) => rowData?.type === CommandType.Text, lookup: Object.fromEntries(userLevels.map(e => [e.rank, e.name])) }
                ]}
                options = {{
                    paging: true,
                    pageSize: 50,
                    pageSizeOptions: [50, 100, 200],
                    actionsColumnIndex: 6,
                    showTitle: false,
                    filtering: true,
                    addRowPosition: "first",
                    padding: "dense"
                }}
                actions = {(userContext.user.userLevel < UserLevels.Moderator) ? [] :
                    [
                        {
                            icon: "add",
                            tooltip: "Add command",
                            isFreeAction: true,
                            onClick: (evt, data) => {
                                const newCommand = { type: CommandType.Text, useCooldown: true } as RowData;
                                setEditingCommand(newCommand);
                            }
                        },
                        rowData => ({
                            tooltip: "Edit command",
                            icon: "edit",
                            disabled: rowData.type === CommandType.System,
                            onClick: (evt, data) => {
                                const command = data as RowData;
                                if (command !== undefined) {
                                    setEditingCommand(command);
                                }
                        }})
                    ]}
                data = {commandlist}
                editable = {(userContext.user.userLevel < UserLevels.Moderator) ? undefined :
                    {
                        isEditable: rowData => rowData.type !== CommandType.System,
                        isDeletable: rowData => rowData.type !== CommandType.System,
                        onRowDelete: oldData => axios.post("/api/commandlist/delete", oldData).then((result) => {
                            const newList = [...commandlist];
                            const target = newList.find((el) => el.id === oldData.id);
                            if (target) {
                                const index = newList.indexOf(target);
                                newList.splice(index, 1);
                                setCommandlist([...newList]);
                            }
                        })
                    }
                }
            />
    </div>;
};

export default CommandList;