import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Box, Typography, Grid, Card, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from "@material-ui/core";
import MaterialTable from "material-table";
import { Alert } from "@material-ui/lab";

const DateCell: React.FC<any> = (date: number) => {
    return (
        <span>
            {date ? new Intl.DateTimeFormat("en", { day: "2-digit", year: "numeric", month: "short" }).format(new Date(date)): "(Ongoing)"}
        </span>
    );
};

type RowData = { id: number, startDate: Date, endDate: Date, plannedEndDate: string };

const SeasonList: React.FC<any> = (props: any) => {
    const [seasonList, setSeasonList] = useState([] as RowData[]);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [newSeasonEnd, setNewSeasonEnd] = useState("");
    const [newSeasonError, setNewSeasonError] = useState("");

    const updateSeasons = useCallback(() => {
        axios.get("/api/seasons").then((response) => {
            if (response) {
                setSeasonList(response.data);
            }
        });
    }, []);

    useEffect(() => updateSeasons(), [updateSeasons]);

    const handleCloseReset = (createSeason: boolean) => {
        if (createSeason) {
            axios.post("/api/seasons/add", { newSeasonEnd }).then((result) => {
                setDialogOpen(false);
                setNewSeasonError("");
                updateSeasons();
            }).catch(error => {
                setNewSeasonError(error.response.data.error.message);
            });
        } else {
            setDialogOpen(false);
            setNewSeasonError("");
        }
    };

    return <Card>
        <Dialog open={dialogOpen} onClose={() => handleCloseReset(false)}>
            <DialogTitle>Start New Season</DialogTitle>
            <DialogContent>
                <Typography>Do you want to start a new season?</Typography>
                <Typography>The following tasks will be performed:</Typography>
                <ul>
                    <li>Reset and archive all users' points</li>
                    <li>Reset tax streak</li>
                    <li>Grant outstanding achievements</li>
                </ul>
                <Typography>New season end date (optional):</Typography>
                <TextField
                    autoFocus
                    margin="dense"
                    id="next-season-end"
                    label="Planned End Date"
                    fullWidth
                    variant="standard"
                    value={newSeasonEnd}
                    onChange={(e) => setNewSeasonEnd(e.target.value)}
                />
                {newSeasonError ? <Alert style={{marginTop: "1em"}} severity="error">{newSeasonError}</Alert> : undefined}
            </DialogContent>
            <DialogActions>
                <Button onClick={() => handleCloseReset(true)} color="primary" autoFocus>Start new season</Button>
                <Button onClick={() => handleCloseReset(false)}>Cancel</Button>
            </DialogActions>
        </Dialog>

        <Grid>
            <Grid item>
                <Box margin={2}>
                    <Button variant="contained" color="primary" onClick={() => setDialogOpen(true)}>Start/end season</Button>
                </Box>
            </Grid>
            <Grid item>
                <MaterialTable
                    title = {<Typography>This list shows all past seasons.</Typography>}
                    columns = {[
                        { title: "Number", field: "id", defaultSort: "desc", editable: "never" },
                        { title: "Start date", field: "startDate", type: "date", render: rowData => DateCell(rowData.startDate), editable: "never" },
                        { title: "End date", field: "endDate", type: "date", render: rowData => DateCell(rowData.endDate), editable: "never" },
                        { title: "Planned end", field: "plannedEndDate", editable: "always" }
                    ]}
                    options = {{
                        paging: false,
                        actionsColumnIndex: 4,
                        showTitle: true,
                        tableLayout: "auto",
                        search: false
                    }}
                    data = {seasonList}
                    editable = {
                        {
                            isEditable: rowData => true,
                            isDeletable: rowData => true,
                            onRowUpdate: (newData, oldData) => axios.post("/api/seasons", newData).then((result) => {
                                if (result.status === 200) {
                                    const newList = [...seasonList];
                                    // @ts-ignore
                                    const index = oldData?.tableData.id;
                                    newList[index] = newData;
                                    setSeasonList(newList);
                                }
                            })
                        }
                    }
                />
            </Grid>
        </Grid>
    </Card>;
};

export default SeasonList;
