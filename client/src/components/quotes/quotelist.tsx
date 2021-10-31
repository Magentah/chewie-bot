import React, { useEffect, useState } from "react";
import axios from "axios";
import MaterialTable from "material-table"
import { Typography } from "@material-ui/core";

const DateCell: React.FC<any> = (date: number) => {
    return (
        <span>
            {date ? new Intl.DateTimeFormat("en", { day: "2-digit", year: "numeric", month: "short" }).format(new Date(date)): "-"}
        </span>
    );
};

const QuoteList: React.FC<any> = (props: any) => {
    type RowData = { id?: number, text: string, author: string, dateAdded: number; addedByUserName: string };

    const [quotelist, setQuotelist] = useState([] as RowData[]);

    useEffect(() => {
        axios.get("/api/quotes").then((response) => {
            setQuotelist(response.data);
        });
    }, []);

    return <div>
            <MaterialTable
                columns = {[
                    {
                        title: "ID", field: "id", type: "numeric", editable: "never",
                        // Workaround to allow at least some degree of column sizing, it's not working as advertised at all.
                        headerStyle: {
                            display: "inline",
                            border: 0
                        },
                        cellStyle: {
                            width: "5em"
                        },
                    },
                    { title: "Quote", field: "text" },
                    {
                        title: "Author", field: "author",
                        cellStyle: {
                            width: "20em"
                        },
                    },
                    {
                        title: "Added by user", field: "addedByUserName",
                        cellStyle: {
                            width: "20em"
                        },
                    },
                    {
                        title: "Creation", field: "dateAdded", type: "date", render: rowData => DateCell(rowData.dateAdded),
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
                    paging: true,
                    actionsColumnIndex: 5,
                    pageSize: 50,
                    pageSizeOptions: [50, 100, 200],
                    showTitle: false,
                    addRowPosition: "first",
                    tableLayout: "auto",
                }}
                data = {quotelist}
                editable = {
                    {
                        isEditable: rowData => true,
                        isDeletable: rowData => true,
                        onRowAdd: (newData) => axios.post("/api/quotes", newData).then((result) => {
                            const newList = [...quotelist, result.data as RowData];
                            setQuotelist(newList);
                        }),
                        onRowUpdate: (newData, oldData) => axios.post("/api/quotes", newData).then((result) => {
                            const newList = [...quotelist];
                            // @ts-ignore
                            const index = oldData?.tableData.id;
                            newList[index] = newData;
                            setQuotelist(newList);
                        }),
                        onRowDelete: oldData => axios.post("/api/quotes/delete", oldData).then((result) => {
                            const newList = [...quotelist];
                            // @ts-ignore
                            const index = oldData?.tableData.id;
                            newList.splice(index, 1);
                            setQuotelist(newList);
                        })
                    }
                }
            />
    </div>;
};

export default QuoteList;