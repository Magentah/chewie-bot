import React from "react";
import MUIDataTable from "mui-datatables";
import { Image } from "react-bootstrap";
import { Grid, Typography, Box } from "@material-ui/core";
import { createMuiTheme, MuiThemeProvider } from "@material-ui/core/styles";

type YTVideo = {
  idx: number;
  id: string;
  duration: string;
  name: string;
  channel: string;
};

const stubData = [
  {
    idx: 0,
    id: "CNRsiu5EeT4",
    duration: "3:27",
    name: "Raiden X 찬열 CHANYEOL - Yours (Feat. 이하이, 창모) Piano Cover",
    channel: "Chewie Melodies",
  },
  {
    idx: 1,
    id: "I-vS4auhAjI",
    duration: "3:25",
    name: "아이유 (IU) - 에잇 / Eight (Prod. & Feat. SUGA) (Piano Cover)",
    channel: "Chewie Melodies",
  },
  {
    idx: 2,
    id: "CdAtlXL9tl0",
    duration: "3:47",
    name: "아이유 (IU) - Last Night Story / 어젯밤 이야기 (Piano Cover)",
    channel: "Chewie Melodies",
  },
  {
    idx: 3,
    id: "2J-5uSvuags",
    duration: "1:19:20",
    name:
      "Jason Yang Violin X ChewieMelodies Collaboration Stream! Part 1 of 4",
    channel: "Chewie Melodies",
  },
];
const x: any = {
  MUIDataTableHeadCell: {
    root: {
      "&:nth-child(2)": {
        width: 150,
      },
    },
  },
};

const getMuiTheme = () => {
  return createMuiTheme({
    overrides: x,
  });
};

const PreviewCell: React.FC<any> = (value) => {
  const datum = stubData[value];
  const url = `https://img.youtube.com/vi/${datum.id}/0.jpg`;
  return (
    <div className="Pog">
      <a href={`https://www.youtube.com/watch?v=${datum.id}`}>
        <Image src={url} thumbnail />
      </a>
    </div>
  );
};

const DetailCell: React.FC<any> = (value) => {
  const datum = stubData[value];
  return (
    <Grid style={{ marginBottom: 40 }}>
      <Grid item xs={12}>
        <Typography>
          <a href={`https://www.youtube.com/watch?v=${datum.id}`}>
            {datum.name}
          </a>
        </Typography>
      </Grid>
      <Grid>
        <Typography>
          <Box fontStyle="italic" fontSize={14}>
            {datum.duration} - {datum.channel}{" "}
          </Box>
        </Typography>
      </Grid>
    </Grid>
  );
};

const columns = [
  {
    label: "Preview",
    name: "idx",
    options: { customBodyRender: PreviewCell },
  },
  {
    label: "Details",
    name: "idx",
    options: { customBodyRender: DetailCell },
  },
];

const SongQueue: React.FC<{}> = (props) => {
  return (
    <MuiThemeProvider theme={getMuiTheme()}>
      <div>
        <MUIDataTable
          title="Song Queue"
          data={stubData}
          columns={columns}
          options={{ elevation: 0 }}
        />
      </div>
    </MuiThemeProvider>
  );
};

export default SongQueue;
