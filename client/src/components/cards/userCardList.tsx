import React, { useEffect, useState } from "react";
import { makeStyles } from "@material-ui/core/styles";
import axios from "axios";
import MaterialTable from "material-table"
import { Box, Button, Typography, Grid } from "@material-ui/core";
import { Image } from "react-bootstrap";
import { DropzoneDialog, FileObject } from "material-ui-dropzone";

type RowData = { id?: number, name: string, setName: string, rarity: number, imageId: string, url: string };

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
                setCurrentFile({url: result.data.url });
                setOpen(false);
            });
        }
    }

    return <Box>
        <Grid container>
            <Grid item>
                <Image height={40} src={currentFile.url} style={{ marginRight: "0.5em" }} />
            </Grid>
            <Grid item>
                <Button variant="contained" color="primary" onClick={() => setOpen(true)}>
                    Add Image
                </Button>
                <DropzoneDialog
                    acceptedFiles={["image/jpeg", "image/png"]}
                    initialFiles={[currentFile.url]}
                    maxFileSize={5000000}
                    open={open}
                    onClose={() => setOpen(false)}
                    onSave={(files) => handleSave(files)}
                    showPreviews={true}
                    showFileNamesInPreview={false}
                    filesLimit={1}
                />
            </Grid>
        </Grid>
    </Box>;
}

const UserCardList: React.FC<any> = (props: any) => {
    const [cardlist, setCardlist] = useState([] as RowData[]);

    useEffect(() => {
        axios.get("/api/cards").then((response) => {
            setCardlist(response.data);
        });
    }, []);

    return <div>
            <MaterialTable
                title = {<Typography>This list shows all user cards that can be collected.</Typography>}
                columns = {[
                    {
                        title: "Name", field: "name",
                        defaultSort: "asc",
                    },
                    { title: "Set name", field: "setName" },
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
                    { title: "Image", field: "image", render: rowData => <ImageCell value={rowData} /> }
                ]}
                options = {{
                    paging: false,
                    actionsColumnIndex: 4,
                    showTitle: false,
                    addRowPosition: "first",
                    tableLayout: "auto",
                }}
                data = {cardlist}
                editable = {
                    {
                        isEditable: rowData => true,
                        isDeletable: rowData => true,
                        onRowAdd: (newData) => axios.post("/api/cards/add", newData).then((result) => {
                            if (result.status === 200) {
                                const newList = [...cardlist, newData];
                                setCardlist(newList);
                            }
                        }),
                        onRowUpdate: (newData, oldData) => axios.post("/api/cards", newData).then((result) => {
                            if (result.status === 200) {
                                const newList = [...cardlist];
                                // @ts-ignore
                                const index = oldData?.tableData.id;
                                newList[index] = newData;
                                setCardlist(newList);
                            }
                        }),
                        onRowDelete: oldData => axios.post("/api/cards/delete", oldData).then((result) => {
                            if (result.status === 200) {
                                const newList = [...cardlist];
                                // @ts-ignore
                                const index = oldData?.tableData.id;
                                newList.splice(index, 1);
                                setCardlist(newList);
                            }
                        })
                    }
                }
            />
    </div>;
};

export default UserCardList;