import React, { useEffect, useState } from "react";
import axios from "axios";
import MaterialTable from "@material-table/core";
import { Typography } from "@mui/material";

const MessageList: React.FC<any> = (props: any) => {
    type RowData = { id?: number, type: string, text: string, eventType: string };

    const [messagelist, setMessagelist] = useState([] as RowData[]);

    useEffect(() => {
        axios.get("/api/messages").then((response) => {
            setMessagelist(response.data);
        });
    }, []);

    return <div>
            <MaterialTable
                title = {<Typography>This list shows all messages which are randomly used in games for specific events.</Typography>}
                columns = {[
                    {
                        title: "Type", field: "type",
                        defaultSort: "asc",
                        initialEditValue: "no-win",
                        lookup: {
                            "no-win" : "No one wins",
                            "all-win": "Everyone wins",
                            "34-percent-win": "Some people win",
                            "single-win": "Single person wins",
                            "single-lose": "Single person loses",
                            "bank-level-1": "Bank Level 1",
                            "bank-level-2": "Bank Level 2",
                            "bank-level-3": "Bank Level 3",
                            "bank-level-4": "Bank Level 4",
                            "bank-level-5": "Bank Level 5"
                        },
                        width: "10em"
                    },
                    { title: "Message", field: "text", width: "70%" },
                    { title: "Event", field: "eventType", initialEditValue: "bankheist", lookup: { "bankheist": "Bankheist" }, width: "9em" }
                ]}
                options = {{
                    paging: false,
                    actionsColumnIndex: 3,
                    showTitle: true,
                    addRowPosition: "first",
                    tableLayout: "auto",
                }}
                data = {messagelist}
                editable = {
                    {
                        isEditable: rowData => true,
                        isDeletable: rowData => true,
                        onRowAdd: (newData) => axios.post("/api/messages", newData).then((result) => {
                            const newList = [...messagelist, result.data as RowData];
                            setMessagelist(newList);
                        }),
                        onRowUpdate: (newData, oldData) => axios.post("/api/messages", newData).then((result) => {
                            const newList = [...messagelist];
                            const target = newList.find((el) => el.id === oldData?.id);
                            if (target) {
                                const index = newList.indexOf(target);
                                newList[index] = newData;
                                setMessagelist([...newList]);
                            }
                        }),
                        onRowDelete: oldData => axios.post("/api/messages/delete", oldData).then((result) => {
                            const newList = [...messagelist];
                            const target = newList.find((el) => el.id === oldData.id);
                            if (target) {
                                const index = newList.indexOf(target);
                                newList.splice(index, 1);
                                setMessagelist([...newList]);
                            }
                        })
                    }
                }
            />
    </div>;
};

export default MessageList;