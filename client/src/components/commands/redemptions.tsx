import React, { useEffect, useState } from "react";
import { makeStyles } from "tss-react/mui";
import axios from "axios";
import MaterialTable from "@material-table/core";
import { Box, Button, Grid, Card, TextField, CircularProgress, Theme } from "@mui/material";
import { Image } from "react-bootstrap";
import { DropzoneArea, DropzoneDialog, FileObject } from "mui-file-dropzone";
import { AddToListState } from "../common/addToListState";
import AddIcon from "@mui/icons-material/Add";

const useStyles = makeStyles()((theme: Theme) => ({
    addButton: {
        margin: theme.spacing(2, 0, 2),
    },
}));

type RowData = { id?: number, imageId: string, message: string, url: string, name: string };
const MaxFileSize = 1024 * 1024 * 15;
const FileTypes = ["image/jpeg", "image/png", "image/gif"];

const ImageCell: React.FC<{value: RowData}> = ({value}) => {
    const [currentFile, setCurrentFile] = useState({ url: value.url});
    const [open, setOpen] = React.useState(false);
    const fileObjects: FileObject[] = [];

    const handleSave = async (files: File[]) => {
        for (const file of files) {
            const formData = new FormData();
            formData.append("redemption", JSON.stringify(value));
            formData.append("image", file);
            axios.post("/api/commandRedemptions/upload", formData, {
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
                    fileObjects={fileObjects}
                />
            </Grid>
        </Grid>;
}

const RedemptionsList: React.FC<any> = (props: any) => {
    const [redemptionlist, setRedemptionlist] = useState([] as RowData[]);
    const [redemptionListState, setRedemptionListState] = useState<AddToListState>();

    const [redemptionMsg, setRedemptionMsg] = useState<string>("");
    const [redemptionName, setRedemptionName] = useState<string>("");
    const [redemptionFile, setRedemptionFile] = useState<File>();

    const { classes } = useStyles();
    const fileObjects: FileObject[] = [];

    useEffect(() => {
        axios.get("/api/commandRedemptions").then((response) => {
            setRedemptionlist(response.data);
        });
    }, []);

    const submitForm = async () => {
        if (!redemptionFile) {
            return;
        }

        try {
            setRedemptionListState({state: "progress"});

            const newData = {
                name: redemptionName,
                message: redemptionMsg
            } as RowData;

            const formData = new FormData();
            formData.append("redemption", JSON.stringify(newData));
            formData.append("image", redemptionFile);
            axios.post("/api/commandRedemptions/upload", formData, {
                headers: {
                  "Content-Type": "multipart/form-data"
                }
            }).then((result) => {
                const newList = [...redemptionlist, result.data];
                setRedemptionListState({state: "success"});
                setRedemptionlist(newList);
                setRedemptionMsg("");
                setRedemptionName("");
                setRedemptionFile(undefined);
            }).catch(error => {
                setRedemptionListState({
                    state: "failed",
                    message: error.response.data.error.message
            })});
        } catch (error: any) {
            setRedemptionListState({
                state: "failed",
                message: error.message
            });
        }
    };

    const addForm = <Box mb={2}>
            <Card><Box py={1} px={2}>
                <form onSubmit={submitForm}>
                    <Grid container style={{ maxWidth: "90em" }}>
                        <Grid item xs={6}>
                            <Grid item>
                                <TextField
                                    id="redemption-name"
                                    label="Name"
                                    fullWidth
                                    value={redemptionName}
                                    onChange={(e) => setRedemptionName(e.target.value)}
                                />
                            </Grid>
                            <Grid item>
                                <TextField
                                    id="redemption-msg"
                                    label="Chat message"
                                    fullWidth
                                    value={redemptionMsg}
                                    onChange={(e) => setRedemptionMsg(e.target.value)}
                                />
                            </Grid>
                            <Grid item>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    startIcon={redemptionListState?.state === "progress" ? <CircularProgress size={15} /> : <AddIcon />}
                                    onClick={submitForm}
                                    className={classes.addButton}
                                    disabled={redemptionListState?.state === "progress" || !redemptionFile || !redemptionName}>
                                    Add
                                </Button>
                            </Grid>
                        </Grid>
                        <Grid item xs={6}>
                            <Box ml={2}>
                                <DropzoneArea maxFileSize={MaxFileSize} acceptedFiles={FileTypes} filesLimit={1} fileObjects={fileObjects}
                                    onChange={(files) => setRedemptionFile(files.length === 0 ? undefined : files[0])} initialFiles={redemptionFile ? [redemptionFile] : undefined} />
                            </Box>
                        </Grid>
                    </Grid>
                </form>
            </Box></Card>
        </Box>;

    return <div>
            {addForm}
            <MaterialTable
                columns = {[
                    { title: "Name", field: "name", },
                    { title: "Chat message", field: "message", },
                    { title: "Image", field: "image", render: rowData => <ImageCell value={rowData} />, editable: "never" }
                ]}
                options = {{
                    paging: false,
                    actionsColumnIndex: 3,
                    showTitle: false,
                    addRowPosition: "first",
                    tableLayout: "auto",
                }}
                data = {redemptionlist}
                editable = {
                    {
                        isEditable: rowData => true,
                        isDeletable: rowData => true,
                        onRowUpdate: (newData, oldData) => axios.post("/api/commandRedemptions", newData).then((result) => {
                            const newList = [...redemptionlist];
                            const target = newList.find((el) => el.id === oldData?.id);
                            if (target) {
                                const index = newList.indexOf(target);
                                newList[index] = newData;
                                setRedemptionlist([...newList]);
                            }
                        }),
                        onRowDelete: oldData => axios.post("/api/commandRedemptions/delete", oldData).then((result) => {
                            const newList = [...redemptionlist];
                            const target = newList.find((el) => el.id === oldData.id);
                            if (target) {
                                const index = newList.indexOf(target);
                                newList.splice(index, 1);
                                setRedemptionlist([...newList]);
                            }
                        })
                    }
                }
            />
    </div>;
};

export default RedemptionsList;
