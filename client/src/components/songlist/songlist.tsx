import React, { useEffect, useState } from "react";
import { makeStyles } from "@material-ui/core/styles";
import axios from "axios";
import MaterialTable from "material-table"
import useUser, { UserLevels } from "../../hooks/user";
import { Grid, TextField, Button, CircularProgress, Box, Card, Accordion, AccordionSummary, Typography, AccordionDetails, Icon, Popover, MenuItem } from "@material-ui/core";
import Autocomplete from "@material-ui/lab/Autocomplete";
import AddIcon from "@material-ui/icons/Add";
import SaveIcon from "@material-ui/icons/Save";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import { AddToListState } from "../common/addToListState";

const useStyles = makeStyles((theme) => ({
    addButton: {
        margin: theme.spacing(2, 0, 2),
    },
}));

function fallbackCopyTextToClipboard(text: string) {
    const textArea = document.createElement("textarea");
    textArea.value = text;

    // Avoid scrolling to bottom
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      const successful = document.execCommand("copy");
      const msg = successful ? "successful" : "unsuccessful";
    } catch (err) {
        // Ignore
    }

    document.body.removeChild(textArea);
}

function copyTextToClipboard(text: string) {
    if (!navigator.clipboard) {
        fallbackCopyTextToClipboard(text);
        return;
    }
    navigator.clipboard.writeText(text);
}

const SongList: React.FC<any> = (props: any) => {
    type RowData = { id: number, title: string, album: string, genre: string, created: number, attributedUserId?: number, attributedUsername: string };
    type AutocompleteUser = { username: string, id: number };

    const classes = useStyles();
    const [songlist, setSonglist] = useState([] as RowData[]);
    const [userlist, setUserlist] = useState([] as AutocompleteUser[]);
    const [user, loadUser] = useUser();

    const [popupAnchor, setPopupAnchor] = React.useState<HTMLButtonElement | undefined>(undefined);
    const [currentRowForAction, setCurrentRowForAction] = useState<RowData>();
    const open = Boolean(popupAnchor);

    const [songlistOrigin, setSonglistOrigin] = useState<string>("");
    const [songlistTitle, setSonglistTitle] = useState<string>("");
    const [songlistGenre, setSonglistGenre] = useState<string>("");
    const [songListState, setSongListState] = useState<AddToListState>();
    const [attributedUser, setAttributedUser] = useState<AutocompleteUser | null>(null);

    useEffect(loadUser, []);

    useEffect(() => {
        axios.get("/api/songlist").then((response) => {
            const results  = response.data as RowData[];
            const newSongs: RowData[] = [];

            // Show new songs (14 days) in a separate category.
            const today = new Date();
            today.setDate(-14);
            for (const row of results) {
                if (row.created > today.getTime()) {
                    newSongs.push({
                        ...row,
                        genre: " 📢 New in the list 🎉"
                     });
                }
            }

            setSonglist(results.concat(newSongs));
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

            const newData = { album: songlistOrigin, title: songlistTitle, genre: songlistGenre } as RowData;
            const result = await axios.post("/api/songlist/add", newData,
                    { validateStatus(status) { return true; }});
            if (result.status === 200) {
                setSongListState({state: "success"});
                setSonglist([...songlist, newData]);
                setSonglistOrigin("");
                setSonglistTitle("");
                setSonglistGenre("");
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

    const songrequestRules = (<Box mb={2}>
        <Accordion defaultExpanded={true}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Rules when requesting songs</Typography>
            </AccordionSummary>
            <AccordionDetails>
            <div>
                <ul>
                    <li>Songs can be requested during medleys or song suggestion sections (usually after live-learns are done). </li>
                    <li>To suggest, just post the title in chat (no links please). You can copy to clipboard using the <Icon fontSize={"small"}>content_copy</Icon> icon in each row.</li>
                    <li>Feel free to ask multiple times if your song is not played, but don't spam.</li>
                    <li>If Chewie continues to ignore your suggestion during medley, he might have forgotten how to play it temporarily. Try again another time!</li>
                </ul>
            </div>
            </AccordionDetails>
        </Accordion>
    </Box>);

    const addForm = (user.userLevel < UserLevels.Moderator) ? undefined :
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
                                inputValue={songlistGenre}
                                /* Use unique values for autocomplete */
                                options={songlist.map((x) => x.genre).filter((v,i,a) => a.indexOf(v) === i)}
                                onInputChange={(event: any, newValue: string | null) => setSonglistGenre(newValue ?? "")}
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

    return <div>
            {attributionPopover}
            {songrequestRules}
            {addForm}
            <MaterialTable
                columns = {[
                    { title: "Artist / Origin", field: "album" },
                    { title: "Title", field: "title" },
                    { title: "Genre", field: "genre", defaultGroupOrder: 0, defaultGroupSort: "asc" }
                ]}
                options = {{
                    paging: false,
                    grouping: true,
                    defaultExpanded: true,
                    actionsColumnIndex: 3,
                    showTitle: false
                }}
                actions={[
                    {
                      icon: "content_copy",
                      tooltip: "Copy to clipboard",
                      onClick: (event, rowData) => {
                        if ((rowData as RowData).title !== undefined) {
                            copyTextToClipboard((rowData as RowData).album + " - " + (rowData as RowData).title);
                        }
                      }
                    },
                    rowData => ({
                        icon: "attribution",
                        iconProps: rowData.attributedUserId ? { color: "primary" } : undefined,
                        tooltip: "Attribute to user",
                        hidden: user.userLevel < UserLevels.Moderator,
                        onClick: (event, r) => {
                          if ((r as RowData).title !== undefined) {
                            openAttributionPopup(event.currentTarget, r as RowData);
                          }
                        }
                    })
                ]}
                data = {songlist}
                editable = {(user.userLevel < UserLevels.Moderator) ? undefined :
                    {
                        isEditable: rowData => true,
                        isDeletable: rowData => true,
                        onRowUpdate: updateSong,
                        onRowDelete: oldData => axios.post("/api/songlist/delete", oldData).then((result) => {
                            if (result.status === 200) {
                                const newSonglist = [...songlist];
                                // @ts-ignore
                                const index = oldData?.tableData.id;
                                newSonglist.splice(index, 1);
                                setSonglist(newSonglist);
                            }
                        })
                    }
                }
            />
    </div>;
};

export default SongList;