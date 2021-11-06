import React, { useEffect, useState } from "react";
import { makeStyles } from "@material-ui/core/styles";
import axios from "axios";
import MaterialTable from "@material-table/core";
import MuiAlert, { AlertProps } from "@material-ui/lab/Alert";
import { Box, Button, Typography, Grid, Card, TextField, CircularProgress, FormControl, InputLabel, Select, MenuItem, FormControlLabel, Checkbox, Snackbar } from "@material-ui/core";
import { Image } from "react-bootstrap";
import { DropzoneArea, DropzoneDialog } from "material-ui-dropzone";
import { AddToListState } from "../common/addToListState";
import { Autocomplete } from "@material-ui/lab";
import AddIcon from "@material-ui/icons/Add";

const useStyles = makeStyles((theme) => ({
    addButton: {
        margin: theme.spacing(2, 0, 2),
    },
}));

type RowData = { id?: number, name: string, setName: string, rarity: number, imageId: string, url: string, baseCardName: string, isUpgrade: boolean };
const MaxFileSize = 1024 * 1024 * 5;
const FileTypes = ["image/jpeg", "image/png"];

const ImageCell: React.FC<{value: RowData}> = ({value}) => {
    const [currentFile, setCurrentFile] = useState({ url: value.url});
    const [open, setOpen] = React.useState(false);

    const handleSave = async (files: File[]) => {
        for (const file of files) {
            const formData = new FormData();
            formData.append("card", JSON.stringify(value));
            formData.append("image", file);
            axios.post("/api/cards/upload", formData, {
                headers: {
                  "Content-Type": "multipart/form-data"
                }
            }).then((result) => {
                if (result) {
                    setCurrentFile({url: result.data.url });
                }
                setOpen(false);
            });
        }
    }

    return <Grid container>
            <Grid item>
                <Image height={40} src={currentFile.url} style={{ marginRight: "0.5em" }} />
            </Grid>
            <Grid item>
                <Button variant="contained" color="primary" onClick={() => setOpen(true)}>
                    Change
                </Button>
                <DropzoneDialog
                    acceptedFiles={FileTypes}
                    initialFiles={[currentFile.url]}
                    maxFileSize={MaxFileSize}
                    open={open}
                    onClose={() => setOpen(false)}
                    onSave={(files) => handleSave(files)}
                    showPreviews={true}
                    showFileNamesInPreview={false}
                    filesLimit={1}
                />
            </Grid>
        </Grid>;
}

function Alert(props: AlertProps) {
    return <MuiAlert elevation={6} variant="filled" {...props} />;
}

const UserCardList: React.FC<any> = (props: any) => {
    const [cardlist, setCardlist] = useState([] as RowData[]);
    const [cardListState, setCardListState] = useState<AddToListState>();

    const [cardName, setCardName] = useState<string>("");
    const [cardSetName, setCardSetName] = useState<string>("");
    const [cardBaseCardName, setCardBaseCardName] = useState<string>("");
    const [cardRarity, setCardRarity] = useState<number>(0);
    const [cardUpgrade, setCardUpgrade] = useState<boolean>(false);
    const [cardFile, setCardFile] = useState<File>();

    const classes = useStyles();

    useEffect(() => {
        axios.get("/api/cards").then((response) => {
            setCardlist(response.data);
        });
    }, []);

    const submitCard = async () => {
        if (!cardFile) {
            return;
        }

        try {
            setCardListState({state: "progress"});

            const newData = { name: cardName, setName: cardSetName, rarity: cardRarity, baseCardName: cardBaseCardName, isUpgrade: cardUpgrade } as RowData;

            const formData = new FormData();
            formData.append("card", JSON.stringify(newData));
            formData.append("image", cardFile);
            axios.post("/api/cards/upload", formData, {
                headers: {
                  "Content-Type": "multipart/form-data"
                }
            }).then((result) => {
                const newList = [...cardlist, result.data];
                setCardListState({state: "success"});
                setCardlist(newList);
                setCardName("");
                setCardSetName("");
                setCardBaseCardName("");
                setCardRarity(0);
                setCardUpgrade(false);
                setCardFile(undefined);
            }).catch(error => {
                setCardListState({
                    state: "failed",
                    message: error.response.data.error.message
                })});
        } catch (error) {
            setCardListState({
                state: "failed",
                message: error.message
            });
        }
    };

    const handleClose = (event?: React.SyntheticEvent, reason?: string) => {
        if (reason === "clickaway") {
            return;
        }
        setCardListState({
            state: undefined
        });
    };

    const addForm = <Box mb={2}>
            <Card><Box py={1} px={2}>
                <form onSubmit={submitCard}>
                    <Grid container style={{ maxWidth: "90em" }}>
                        <Grid item xs={6}>
                            <Grid item>
                                <TextField
                                    id="card-name"
                                    label="Name"
                                    fullWidth
                                    value={cardName}
                                    onChange={(e) => setCardName(e.target.value)}
                                />
                            </Grid>
                            <Grid item>
                                <Autocomplete
                                    id="card-setname"
                                    freeSolo
                                    fullWidth
                                    inputValue={cardSetName}
                                    /* Use unique values for autocomplete */
                                    options={cardlist.map((x) => x.setName).filter((v,i,a) => v && a.indexOf(v) === i)}
                                    onInputChange={(event: any, newValue: string | null) => setCardSetName(newValue ?? "")}
                                    renderInput={(params: any) => (
                                        <TextField {...params} label="Set name" fullWidth />
                                    )}
                                />
                            </Grid>
                            <Grid item>
                                <Autocomplete
                                    id="card-basecard"
                                    freeSolo
                                    fullWidth
                                    inputValue={cardBaseCardName}
                                    /* Use unique values for autocomplete */
                                    options={cardlist.map((x) => x.name).filter((v,i,a) => v && a.indexOf(v) === i)}
                                    onInputChange={(event: any, newValue: string | null) => setCardBaseCardName(newValue ?? "")}
                                    renderInput={(params: any) => (
                                        <TextField {...params} label="Base card name" fullWidth />
                                    )}
                                />
                            </Grid>
                            <Grid item container alignItems="center" direction="row">
                                <Grid item xs>
                                    <FormControl fullWidth style={{ marginTop: 15 }}>
                                        <InputLabel>Rarity</InputLabel>
                                        <Select
                                            value={cardRarity}
                                            onChange={(event: React.ChangeEvent<{ name?: string | undefined; value: unknown; }>) => setCardRarity(event.target.value as number ?? 0)}>
                                            <MenuItem value={0}>Common</MenuItem>
                                            <MenuItem value={1}>Uncommon</MenuItem>
                                            <MenuItem value={2}>Rare</MenuItem>
                                            <MenuItem value={3}>Mythical</MenuItem>
                                            <MenuItem value={4}>Legendary</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs>
                                    <FormControlLabel style={{marginTop: "2em", marginLeft: "0.5em"}}
                                        control={
                                        <Checkbox
                                            checked={cardUpgrade}
                                            onChange={(e) => setCardUpgrade(e.target.checked)}
                                            name="cards-isugprade"
                                        />}
                                        label="Upgrades an existing card"
                                    />
                                </Grid>
                            </Grid>
                            <Grid item>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    startIcon={cardListState?.state === "progress" ? <CircularProgress size={15} /> : <AddIcon />}
                                    onClick={submitCard}
                                    className={classes.addButton}
                                    disabled={cardListState?.state === "progress" || !cardFile || !cardName}>
                                    Add
                                </Button>
                            </Grid>
                        </Grid>
                        <Grid item xs={6}>
                            <Box ml={2}>
                                <DropzoneArea maxFileSize={MaxFileSize} acceptedFiles={FileTypes} filesLimit={1}
                                    onChange={(files) => setCardFile(files.length === 0 ? undefined : files[0])} initialFiles={cardFile ? [cardFile] : undefined} />
                            </Box>
                        </Grid>
                    </Grid>
                </form>
            </Box>
            {cardListState?.state === "failed" ?
            <Snackbar open={cardListState?.state === "failed"} autoHideDuration={8000} onClose={handleClose}>
                <Alert onClose={handleClose} severity="error">
                    Card cannot be added: {cardListState.message}
                </Alert>
            </Snackbar> : undefined}
            </Card>
        </Box>;

    return <div>
            {addForm}
            <MaterialTable
                title = {<Typography>This list shows all user cards that can be collected.</Typography>}
                columns = {[
                    {
                        title: "Name", field: "name",
                        defaultSort: "asc",
                    },
                    { title: "Set name", field: "setName" },
                    { title: "Base card name", field: "baseCardName" },
                    {
                        title: "Rarity", field: "rarity",
                        initialEditValue: 0,
                        lookup: {
                            0: "Common",
                            1: "Uncommon",
                            2: "Rare",
                            3: "Mythical",
                            4: "Legendary"
                        },
                    },
                    { title: "Upgrade version", field: "isUpgrade", type: "boolean" },
                    { title: "Image", field: "image", render: rowData => <ImageCell value={rowData} />, editable: "never" }
                ]}
                options = {{
                    paging: false,
                    actionsColumnIndex: 6,
                    showTitle: false,
                    addRowPosition: "first",
                    tableLayout: "auto",
                    padding: "dense"
                }}
                data = {cardlist}
                editable = {
                    {
                        isEditable: rowData => true,
                        isDeletable: rowData => true,
                        onRowUpdate: (newData, oldData) => axios.post("/api/cards", newData).then((result) => {
                            const newList = [...cardlist];
                            // @ts-ignore
                            const target = newList.find((el) => el.id === oldData.tableData.id);
                            if (target) {
                                const index = newList.indexOf(target);
                                newList[index] = newData;
                                setCardlist([...newList]);
                            }
                        }),
                        onRowDelete: oldData => axios.post("/api/cards/delete", oldData).then((result) => {
                            const newList = [...cardlist];
                            // @ts-ignore
                            const target = newList.find((el) => el.id === oldData.tableData.id);
                            if (target) {
                                const index = newList.indexOf(target);
                                newList.splice(index, 1);
                                setCardlist([...newList]);
                            }
                        })
                    }
                }
            />
    </div>;
};

export default UserCardList;
