import React, { useEffect, useState } from "react";
import { makeStyles } from "@material-ui/core/styles";
import axios from "axios";
import MaterialTable from 'material-table'
import useUser, { UserLevels } from "../../hooks/user";
import { Grid, TextField, Button, CircularProgress, Box, Card } from "@material-ui/core";
import AddIcon from '@material-ui/icons/Add';

const useStyles = makeStyles((theme) => ({
    addButton: {
        margin: theme.spacing(2, 0, 2),
    },
}));

type NoSongListState = {
    state: undefined;
};

type AddedSongListState = {
    state: "success";
};

type AddingSongListState = {
    state: "progress";
};

type FailedSongListState = {
    state: "failed";
    message: string;
};
   
type SongListState = NoSongListState | AddedSongListState | AddingSongListState | FailedSongListState;

const SongList: React.FC<any> = (props: any) => {
    const classes = useStyles();
    const [songlist, setSonglist] = useState([] as any);
    const [user, loadUser] = useUser();

    const [songlistOrigin, setSonglistOrigin] = useState<string>();
    const [songlistTitle, setSonglistTitle] = useState<string>();
    const [songlistGenre, setSonglistGenre] = useState<string>();
    const [songListState, setSongListState] = useState<SongListState>();

    useEffect(() => {
        loadUser();
        
        axios.get("/api/songlist").then((response) => {
            setSonglist(response.data);
        });
    }, []);

    const submitSongList = async () => {
        try {
            setSongListState({state: "progress"});

            const newData = { album: songlistOrigin, title: songlistTitle, genre: songlistGenre };
            const result = await axios.post("/api/songlist/add", newData,
                    { validateStatus: function(status) {  return true; }});
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

    const addForm = (user.userLevelKey < UserLevels.Moderator) ? undefined :
        <Box mb={2}>
            <Card><Box py={1} px={2}>
                <form onSubmit={submitSongList}>
                    <Grid container spacing={2} justify="flex-start">
                        <Grid item xs={4}>
                            <TextField
                                id="song-origin"
                                label="Origin / Artist"
                                fullWidth
                                value={songlistOrigin}
                                onChange={(e) => setSonglistOrigin(e.target.value)}
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
                            <TextField
                                id="song-genre"
                                label="Genre"
                                fullWidth
                                value={songlistGenre}
                                onChange={(e) => setSonglistGenre(e.target.value)}
                            />
                        </Grid>
                        <Grid item xs={1}>
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

    return <div>
            {addForm}
            <MaterialTable
                columns = {[
                    { title: 'Artist / Origin', field: 'album' },
                    { title: 'Title', field: 'title' },
                    { title: 'Genre', field: 'genre', defaultGroupOrder: 0, defaultGroupSort: "asc" }
                ]}
                options = {{
                    paging: false,
                    grouping: true,
                    defaultExpanded: true,
                    actionsColumnIndex: 3,
                    showTitle: false
                }}
                data = {songlist}
                editable = {(user.userLevelKey < UserLevels.Moderator) ? undefined :
                    {
                        isEditable: rowData => true,
                        isDeletable: rowData => true,
                        onRowUpdate: (newData, oldData) => axios.post("/api/songlist", newData).then((result) => {
                            if (result.status === 200) {
                                const newSonglist = [...songlist];
                                //@ts-ignore
                                const index = oldData?.tableData.id;
                                newSonglist[index] = newData;
                                setSonglist(newSonglist);
                            }
                        }),
                        onRowDelete: oldData => axios.post("/api/songlist/delete", oldData).then((result) => {
                            if (result.status === 200) {
                                const newSonglist = [...songlist];
                                //@ts-ignore
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