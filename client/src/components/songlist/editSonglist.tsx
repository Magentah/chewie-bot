import React, { useEffect, useState } from "react";
import { makeStyles } from "tss-react/mui";
import axios from "axios";
import MaterialTable from "@material-table/core";
import {
    Grid, TextField, Button, Box, Card,
    Popover, Paper, ThemeProvider, Tabs, Tab, Chip, Theme, createTheme
} from "@mui/material";
import { Autocomplete, AutocompleteInputChangeReason } from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";

// Use "condensed" display for rows
const createCondensedTheme = (theme: any) => createTheme(theme, {
    components: {
        MuiTableCell: {
            styleOverrides: {
                root: {
                    padding: "0 16px",
                }
            }
        },
        MuiIconButton: {
            styleOverrides: {
                root: {
                    padding: "6px 8px",
                }
            }
        },
        MuiInputBase: {
            styleOverrides: {
                root: {
                    fontSize: "13px",
                }
            }
        }
    }
});

const useStyles = makeStyles()((theme: Theme) => ({
    addButton: {
        margin: theme.spacing(2, 0, 2),
    },
    tableContainer: {
        marginTop: theme.spacing(2)
    },
    tagContainer: {
        display: "flex",
        flexWrap: "wrap",
        listStyle: "none",
        margin: 0,
      },
    chip: {
        margin: theme.spacing(0.5),
    },
}));

const EditSonglist: React.FC<any> = (props: any) => {
    type RowData = {
        id: number, title: string, album: string, artist: string, categoryId: number,
        created: number, attributedUserId?: number, attributedUsername: string, songTags: string[]
    };
    type CategoryData = { id: number, name: string, sortOrder: number };
    type TagData = { id: number, name: string };
    type AutocompleteUser = { username: string, id: number };

    const { classes } = useStyles();
    const [songlist, setSonglist] = useState([] as RowData[]);
    const [categories, setCategories] = useState([] as CategoryData[]);
    const [tags, setTags] = useState([] as TagData[]);
    const [userlist, setUserlist] = useState([] as AutocompleteUser[]);
    const [selectedTab, setSelectedTab] = useState(0);

    const [popupAnchor, setPopupAnchor] = useState<HTMLButtonElement | undefined>(undefined);
    const [currentRowForAction, setCurrentRowForAction] = useState<RowData>();
    const open = Boolean(popupAnchor);

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
        axios.get("/api/songlist/tags").then((response) => {
            const results  = response.data as TagData[];
            setTags(results);
        });
    }, []);

    useEffect(() => {
        axios.get("/api/userlist/songrequests").then((response) => {
            setUserlist(response.data);
        });
    }, []);

    const updateSong = (newData: RowData, oldData: RowData | undefined) => axios.post("/api/songlist", newData).then((result) => {
        const newSonglist = [...songlist];
        // @ts-ignore
        const target = newSonglist.find((el) => el.id === oldData.tableData.id);
        if (target) {
            const index = newSonglist.indexOf(target);
            newSonglist[index] = newData;
            setSonglist([...newSonglist]);
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
            setCategories([...newState]);
        });
    };

    const handleTabChange = (event: React.ChangeEvent<{}>, tab: number) => {
        setSelectedTab(tab);
    };

    const hasIndex = (categories: CategoryData[], category: CategoryData, index: number) => {
        const obj = categories.find((el) => el.id === category.id);
        return obj && categories.indexOf(obj) === index;
    }

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
                    <Grid container spacing={2} justifyContent="flex-start" wrap={"nowrap"} alignItems="center">
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

        const categoryTable = <MaterialTable
            columns = {[
                { title: "Category", field: "name", customSort: () => 0 }
            ]}
            options = {{
                paging: false,
                maxColumnSort: 0,
                actionsColumnIndex: 1,
                showTitle: false,
                search: false,
                toolbar: true
            }}
            actions={[
                rowData => ({
                    icon: ArrowUpwardIcon,
                    tooltip: "Move up",
                    disabled: hasIndex(categories, rowData, 0),
                    onClick: (event, data) => (data as CategoryData[]).length ? onCategoryMoved(data as CategoryData[], -1) : onCategoryMoved([ data as CategoryData ], -1)
                }),
                rowData => ({
                    icon: ArrowDownwardIcon,
                    tooltip: "Move down",
                    disabled: hasIndex(categories, rowData, categories.length - 1),
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
                        const target = newCategories.find((el) => el.id === oldData.tableData.id);
                        if (target) {
                            const index = newCategories.indexOf(target);
                            newCategories[index] = newData;
                            setCategories([...newCategories]);
                        }
                    }),
                    onRowDelete: oldData => axios.post("/api/songlist/categories/delete", oldData).then((result) => {
                        const newCategories = [...categories];
                        // @ts-ignore
                        const target = newCategories.find((el) => el.id === oldData.tableData.id);
                        if (target) {
                            const index = newCategories.indexOf(target);
                            newCategories.splice(index, 1);
                            setCategories([...newCategories]);
                        }
                    })
                }
            }
            components={{
                Container: p => <Paper {...p} elevation={0} className={classes.tableContainer} style={{marginTop: 0}} />
            }}
            />;

        const songlistTable = <MaterialTable
            columns = {[
                {
                    title: "Origin", field: "album", defaultSort: "asc",
                    editComponent: p => (
                        <Autocomplete
                            id="song-origin"
                            freeSolo
                            size="small"
                            fullWidth
                            defaultValue={p.value ?? ""}
                            inputValue={p.value ?? ""}
                            /* Use unique values for autocomplete */
                            options={songlist.map((x) => x.album).filter((v,i,a) => v && a.indexOf(v) === i)}
                            onInputChange={(event: any, newValue: string | null) => p.onChange(newValue)}
                            renderInput={(params: any) => (
                                <TextField {...params} placeholder="Origin" fullWidth size="small" />
                            )}
                        />)
                },
                { title: "Title", field: "title" },
                {
                    title: "Artist", field: "artist",
                    editComponent: p => (
                        <Autocomplete
                            id="song-artist"
                            freeSolo
                            size="small"
                            fullWidth
                            defaultValue={p.value ?? ""}
                            inputValue={p.value ?? ""}
                            /* Use unique values for autocomplete */
                            options={songlist.map((x) => x.artist).filter((v,i,a) => v && a.indexOf(v) === i)}
                            onInputChange={(event: any, newValue: string | null) => p.onChange(newValue)}
                            renderInput={(params: any) => (
                                <TextField {...params} placeholder="Artist" fullWidth />
                            )}
                        />)
                },
                { title: "Genre", field: "categoryId", lookup: Object.fromEntries(categories.map(e => [e.id, e.name])) },
                {
                    title: "Tags", field: "songTags",
                    render: rowData =>
                        (<Box className={classes.tagContainer}>
                        {rowData.songTags?.map((data) => {
                                return (
                                <li key={data}>
                                    <Chip size="small" label={data} className={classes.chip} />
                                </li>);
                        })}
                        </Box>),
                    editComponent: p => (
                        <Autocomplete
                            multiple
                            id="song-tags"
                            options={tags.map((option) => option.name)}
                            defaultValue={p.value ?? []}
                            value={p.value ?? []}
                            freeSolo
                            size="small"
                            onChange={(event: any, newValue: string[] | null) => p.onChange(newValue)}
                            renderTags={(value: string[], getTagProps) =>
                                value.map((option: string, index: number) => (
                                    <Chip size="small" variant="outlined" label={option} {...getTagProps({ index })} />
                                ))
                            }
                            onInputChange={(event: any, newValue: string, reason: AutocompleteInputChangeReason) => {
                                // Create new tag when user types ";" (we should allow spaces in tags btw)
                                const newTags = newValue.split(";");
                                if (newTags.length > 1) {
                                    const newTagsList = newTags.filter(x => x !== "");
                                    p.onChange(p.value ? p.value.concat(newTagsList) : newTagsList);
                                }
                            }}
                            renderInput={(params) => (
                                <TextField {...params} label="" placeholder="Tags"
                                    onBlur={e => {
                                        // Create new tag when input focus is lost
                                        const newTags = e.target.value.split(";");
                                        if (newTags.length) {
                                            const newTagsList = newTags.filter(x => x !== "");
                                            p.onChange(p.value ? p.value.concat(newTagsList) : newTagsList);
                                        }
                                    }}
                                />
                            )}
                        />)
                },
            ]}
            options = {{
                paging: true,
                pageSize: 50,
                pageSizeOptions: [50, 100, 200],
                actionsColumnIndex: 5,
                showTitle: false,
                search: true,
                addRowPosition: "first",
                filtering: true
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
                        const target = newSonglist.find((el) => el.id === oldData.tableData.id);
                        if (target) {
                            const index = newSonglist.indexOf(target);
                            newSonglist.splice(index, 1);
                            setSonglist([...newSonglist]);
                        }
                    })
                }
            }
            components={{
                Container: p => <Paper {...p} elevation={0} className={classes.tableContainer} style={{marginTop: 0}} />
            }}
        />;

    return <Box>
            {attributionPopover}
            <Card>
                <ThemeProvider theme={(theme) => createCondensedTheme(theme)}>
                    <Tabs value={selectedTab}
                          indicatorColor="primary"
                          textColor="primary"
                          onChange={handleTabChange}>
                          <Tab label={"Songs"} value={0} />
                          <Tab label={"Categories"} value={1} />
                    </Tabs>

                    {selectedTab === 0 ? songlistTable : categoryTable}
                </ThemeProvider>
            </Card>
        </Box>;
};

export default EditSonglist;