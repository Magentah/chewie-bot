import React, { useEffect, useState } from "react";
import axios from "axios";
import MaterialTable from "material-table"
import { Typography } from "@material-ui/core";

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
                        // Workaround to allow at least some degree of column sizing, it's not working as advertised at all.
                        headerStyle: {
                            display: "inline",
                            border: 0
                        },
                        cellStyle: {
                            width: "12em"
                        },
                    },
                    { title: "Message", field: "text" },
                    {
                        title: "Event", field: "eventType", initialEditValue: "bankheist", lookup: { "bankheist": "Bankheist" },
                        // Workaround to allow at least some degree of column sizing, it's not working as advertised at all.
                        headerStyle: {
                            display: "inline",
                            border: 0
                        },
                        cellStyle: {
                            width: "10em"
                        },
                    }
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
                            if (result.status === 200) {
                                const newList = [...messagelist, newData];
                                setMessagelist(newList);
                            }
                        }),
                        onRowUpdate: (newData, oldData) => axios.post("/api/messages", newData).then((result) => {
                            if (result.status === 200) {
                                const newList = [...messagelist];
                                //@ts-ignore
                                const index = oldData?.tableData.id;
                                newList[index] = newData;
                                setMessagelist(newList);
                            }
                        }),
                        onRowDelete: oldData => axios.post("/api/messages/delete", oldData).then((result) => {
                            if (result.status === 200) {
                                const newList = [...messagelist];
                                //@ts-ignore
                                const index = oldData?.tableData.id;
                                newList.splice(index, 1);
                                setMessagelist(newList);
                            }
                        })
                    }
                }
            />
    </div>;
};

export default MessageList;