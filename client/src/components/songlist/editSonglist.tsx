import React, { useEffect, useState } from "react";
import { makeStyles, createTheme } from "@material-ui/core/styles";
import axios from "axios";
import MaterialTable from "material-table"
import {
    Grid, TextField, Button, CircularProgress, Box, Card,
    Popover, Paper, ThemeProvider
} from "@material-ui/core";
import Autocomplete from "@material-ui/lab/Autocomplete";
import AddIcon from "@material-ui/icons/Add";
import SaveIcon from "@material-ui/icons/Save";
import { AddToListState } from "../common/addToListState";
import ArrowDownwardIcon from "@material-ui/icons/ArrowDownward";
import ArrowUpwardIcon from "@material-ui/icons/ArrowUpward";

// Use "condensed" display for rows
const condensedTheme = createTheme({
    overrides: {
      MuiTableCell: {
        root: {
          padding: "0 16px",
        }
      },
      MuiIconButton: {
        root: {
          padding: "6px 8px",
        }
      }
    }
});

const useStyles = makeStyles((theme) => ({
    addButton: {
        margin: theme.spacing(2, 0, 2),
    },
    tableContainer: {
        marginTop: theme.spacing(2)
    }
}));

const EditSonglist: React.FC<any> = (props: any) => {
    type RowData = { id: number, title: string, album: string, artist: string, categoryId: number, created: number, attributedUserId?: number, attributedUsername: string };
    type CategoryData = { id: number, name: string, sortOrder: number };
    type AutocompleteUser = { username: string, id: number };

    const classes = useStyles();
    const [songlist, setSonglist] = useState([] as RowData[]);
    const [categories, setCategories] = useState([] as CategoryData[]);
    const [userlist, setUserlist] = useState([] as AutocompleteUser[]);

    const [popupAnchor, setPopupAnchor] = useState<HTMLButtonElement | undefined>(undefined);
    const [currentRowForAction, setCurrentRowForAction] = useState<RowData>();
    const open = Boolean(popupAnchor);

    const [songlistOrigin, setSonglistOrigin] = useState<string>("");
    const [songlistTitle, setSonglistTitle] = useState<string>("");
    const [songlistGenre, setSonglistGenre] = useState<number>(0);
    const [songListState, setSongListState] = useState<AddToListState>();
    const [attributedUser, setAttributedUser] = useState<AutocompleteUser | null>(null);

    useEffect(() => {
        axios.get("/api/songlist").then((response) => {
            const results  = response.data as RowData[];
            setSonglist(results);
        });
        axios.get("/api/songlist/categories").then((response) => {
            const results  = response.data as CategoryData[];
            setCategories(results);
        });
    }, []);

    useEffect(() => {
        axios.get("/api/userlist/songrequests").then((response) => {
            setUserlist(response.data);
        });
    }, []);

    const submitSongList = async () => {
        try {
            setSongListState({state: "progress"});

            const newData = { album: songlistOrigin, title: songlistTitle, categoryId: songlistGenre } as RowData;
            const result = await axios.post("/api/songlist/add", newData,
                    { validateStatus(status) { return true; }});
            if (result.status === 200) {
                setSongListState({state: "success"});
                setSonglist([...songlist, newData]);
                setSonglistOrigin("");
                setSonglistTitle("");
                setSonglistGenre(0);
            } else {
                setSongListState({
                    state: "failed",
                    message: result.data.error.message
                });
            }
        } catch (error) {
            setSongListState({
                state: "failed",
                message: error.message
            });
        }
    };

    const updateSong = (newData: RowData, oldData: RowData | undefined) => axios.post("/api/songlist", newData).then((result) => {
        if (result.status === 200) {
            const newSonglist = [...songlist];
            // @ts-ignore
            const index = oldData?.tableData.id;
            newSonglist[index] = newData;
            setSonglist(newSonglist);
        }
    });

    const onCategoryMoved = (rowsMoved: CategoryData[], direction: number) => {
        const newState = [...categories];

        // Reorder categories according to direction.
        for (const row of rowsMoved) {
            for (let i = 0; i < categories.length; i++) {
                if (categories[i].id === row.id) {
                    const category = categories[i];
                    newState.splice(i, 1);
                    newState.splice(i + direction, 0, category);
                }
            }
        }

        // Assign new sort order for all items to avoid inconsistencies.
        for (let i = 0; i < newState.length; i++) {
            newState[i].sortOrder = i + 1;
        }

        axios.post("/api/songlist/categories", newState).then(() => {
            setCategories(newState);
        });
    };

    const openAttributionPopup = (button: HTMLButtonElement, song: RowData) => {
        setPopupAnchor(button);
        setCurrentRowForAction(song);
        if (song.attributedUserId) {
            setAttributedUser({id: song.attributedUserId, username: song.attributedUsername});
        } else {
            setAttributedUser(null);
        }
    };

    const saveAttribution = async () => {
        if (currentRowForAction) {
            const updatedRow: RowData = {...currentRowForAction};
            updatedRow.attributedUserId = attributedUser?.id;
            updateSong(updatedRow, currentRowForAction);
            setPopupAnchor(undefined);
        }
    };

    const addForm =
        <Box mb={2}>
            <Card><Box py={1} px={2}>
                <form onSubmit={submitSongList}>
                    <Grid container spacing={2} justify="flex-start" wrap={"nowrap"}>
                        <Grid item xs={4}>
                            <Autocomplete
                                id="song-origin"
                                freeSolo
                                fullWidth
                                inputValue={songlistOrigin}
                                /* Use unique values for autocomplete */
                                options={songlist.map((x) => x.album).filter((v,i,a) => a.indexOf(v) === i)}
                                onInputChange={(event: any, newValue: string | null) => setSonglistOrigin(newValue ?? "")}
                                renderInput={(params: any) => (
                                    <TextField {...params} label="Origin / Artist" fullWidth />
                                )}
                            />
                        </Grid>
                        <Grid item xs={4}>
                            <TextField
                                id="song-title"
                                label="Title"
                                fullWidth
                                value={songlistTitle}
                                onChange={(e) => setSonglistTitle(e.target.value)}
                            />
                        </Grid>
                        <Grid item xs={3}>
                            <Autocomplete
                                id="song-genre"
                                freeSolo
                                fullWidth
                                options={categories}
                                /* inputValue={songlistGenre}
                                Use unique values for autocomplete 
                                onInputChange={(event: any, newValue: string | null) => setSonglistGenre(newValue ?? "")}*/
                                renderInput={(params: any) => (
                                    <TextField {...params} label="Genre" fullWidth />
                                )}
                            />
                        </Grid>
                        <Grid item xs={1} style={{minWidth: "7em"}} >
                            <Button
                                variant="contained"
                                color="primary"
                                startIcon={songListState?.state === "progress" ? <CircularProgress size={15} /> : <AddIcon />}
                                onClick={submitSongList}
                                className={classes.addButton}
                                disabled={songListState?.state === "progress"}>
                                Add
                            </Button>
                        </Grid>
                    </Grid>
                </form>
            </Box></Card>
        </Box>;

    const attributionPopover = <Popover
        open = {open}
        anchorEl = {popupAnchor}
        onClose = {() => setPopupAnchor(undefined)}
        anchorOrigin = {{
            vertical: "bottom",
            horizontal: "center"
        }}>
            <Box py={1} px={2}>
                <form>
                    <Grid container spacing={2} justify="flex-start" wrap={"nowrap"} alignItems="center">
                        <Grid item>
                            <Autocomplete
                                id="set-user"
                                options={userlist}
                                value={attributedUser}
                                onChange={(event: any, newValue: AutocompleteUser | null) => {
                                    setAttributedUser(newValue);
                                }}
                                getOptionLabel={(option) => option.username}
                                renderInput={(params) => <TextField {...params} label="Attribute to user" helperText="Select the user who requested this song often enough to be on the song list." />}
                            />
                        </Grid>
                        <Grid item>
                            <Button variant="contained" color="primary" startIcon={<SaveIcon />} onClick={() => saveAttribution()}>Save</Button>
                        </Grid>
                    </Grid>
                </form>
            </Box>
        </Popover>;

    return <Box>
            {attributionPopover}
            {addForm}
            <Card>
                <ThemeProvider theme={condensedTheme}>
                    <MaterialTable
                        columns = {[
                            { title: "Category", field: "name" }
                        ]}
                        options = {{
                            paging: false,
                            sorting: false,
                            actionsColumnIndex: 1,
                            showTitle: false,
                            search: false,
                            toolbar: true
                        }}
                        actions={[
                            rowData => ({
                                icon: ArrowUpwardIcon,
                                tooltip: "Move up",
                                disabled: categories.indexOf(rowData) === 0,
                                onClick: (event, data) => (data as CategoryData[]).length ? onCategoryMoved(data as CategoryData[], -1) : onCategoryMoved([ data as CategoryData ], -1)
                            }),
                            rowData => ({
                                icon: ArrowDownwardIcon,
                                tooltip: "Move down",
                                disabled: categories.indexOf(rowData) === categories.length - 1,
                                onClick: (event, data) => (data as CategoryData[]).length ? onCategoryMoved(data as CategoryData[], 1) : onCategoryMoved([ data as CategoryData ], 1)
                            }),
                        ]}
                        data = {categories}
                        editable = {
                            {
                                isEditable: rowData => true,
                                isDeletable: rowData => true,
                                onRowAdd: (newData) => axios.post("/api/songlist/categories/add", newData).then((result) => {
                                    const newList = [...categories, result.data as CategoryData];
                                    setCategories(newList);
                                }),
                                onRowUpdate: (newData, oldData) => axios.post("/api/songlist/categories/update", newData).then((result) => {
                                    const newCategories = [...categories];
                                    // @ts-ignore
                                    const index = oldData?.tableData.id;
                                    newCategories[index] = newData;
                                    setCategories(newCategories);
                                }),
                                onRowDelete: oldData => axios.post("/api/songlist/categories/delete", oldData).then((result) => {
                                    const newCategories = [...categories];
                                    // @ts-ignore
                                    const index = oldData?.tableData.id;
                                    newCategories.splice(index, 1);
                                    setCategories(newCategories);
                                })
                            }
                        }
                        components={{
                            Container: p => <Paper {...p} elevation={0} className={classes.tableContainer} />
                        }}
                    />

                    <MaterialTable
                        columns = {[
                            { title: "Origin", field: "album", defaultSort: "asc" },
                            { title: "Title", field: "title" },
                            { title: "Artist", field: "artist" },
                            { title: "Genre", field: "categoryId", lookup: Object.fromEntries(categories.map(e => [e.id, e.name])) }
                        ]}
                        options = {{
                            paging: true,
                            pageSize: 50,
                            pageSizeOptions: [50, 100, 200],
                            actionsColumnIndex: 4,
                            showTitle: false,
                            search: true,
                            addRowPosition: "first"
                        }}
                        actions={[
                            rowData => ({
                                icon: "attribution",
                                iconProps: rowData.attributedUserId ? { color: "primary" } : undefined,
                                tooltip: "Attribute to user",
                                onClick: (event, r) => {
                                    if ((r as RowData).title !== undefined) {
                                        openAttributionPopup(event.currentTarget, r as RowData);
                                    }
                                }
                            })
                        ]}
                        data = {songlist}
                        editable = {
                            {
                                isEditable: rowData => true,
                                isDeletable: rowData => true,
                                onRowAdd: (newData) => axios.post("/api/songlist/add", newData).then((result) => {
                                    const newList = [...songlist, result.data as RowData];
                                    setSonglist(newList);
                                }),
                                onRowUpdate: updateSong,
                                onRowDelete: oldData => axios.post("/api/songlist/delete", oldData).then((result) => {
                                    const newSonglist = [...songlist];
                                    // @ts-ignore
                                    const index = oldData?.tableData.id;
                                    newSonglist.splice(index, 1);
                                    setSonglist(newSonglist);
                                })
                            }
                        }
                        components={{
                            Container: p => <Paper {...p} elevation={0} className={classes.tableContainer} />
                        }}
                    />
                </ThemeProvider>
            </Card>
    </Box>;
};

export default EditSonglist;