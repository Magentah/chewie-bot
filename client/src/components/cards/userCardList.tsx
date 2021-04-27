import React, { useEffect, useState } from "react";
import axios from "axios";
import MaterialTable from "material-table"
import { Typography } from "@material-ui/core";

const UserCardList: React.FC<any> = (props: any) => {
    type RowData = { id?: number, name: string, setName: string, rarity: number, image: any };

    const [cardlsit, setCardlist] = useState([] as RowData[]);

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
                    { title: "Image", field: "image" }
                ]}
                options = {{
                    paging: false,
                    actionsColumnIndex: 4,
                    showTitle: false,
                    addRowPosition: "first",
                    tableLayout: "auto",
                }}
                data = {cardlsit}
                editable = {
                    {
                        isEditable: rowData => true,
                        isDeletable: rowData => true,
                        onRowAdd: (newData) => axios.post("/api/cards/add", newData).then((result) => {
                            if (result.status === 200) {
                                const newList = [...cardlsit, newData];
                                setCardlist(newList);
                            }
                        }),
                        onRowUpdate: (newData, oldData) => axios.post("/api/cards", newData).then((result) => {
                            if (result.status === 200) {
                                const newList = [...cardlsit];
                                // @ts-ignore
                                const index = oldData?.tableData.id;
                                newList[index] = newData;
                                setCardlist(newList);
                            }
                        }),
                        onRowDelete: oldData => axios.post("/api/cards/delete", oldData).then((result) => {
                            if (result.status === 200) {
                                const newList = [...cardlsit];
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