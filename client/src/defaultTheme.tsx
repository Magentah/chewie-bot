import { PaletteMode } from "@mui/material";
import { createContext } from "react";

export const SidebarWidth = 230;

export const getDesignTokens = (mode: PaletteMode) => ({
    palette: {
      mode,
      ...(mode === 'light'
        ? {
            background: {
                default: "#FAFAFA",
            },
          }
        : {
            // palette values for dark mode
          }),
    },
    components: {
        MuiAppBar: {
            styleOverrides: {
                root: {
                    backgroundColor: "#282c34",
                    color: "white",
                    width: `calc(100% - ${SidebarWidth}px)`,
                    marginLeft: SidebarWidth
                },
            },
        },
        MuiLink: {
            styleOverrides: {
                root: {
                    textDecoration: "none",
                    "&:hover": {
                        textDecoration: "underline",
                    },
                }
            }
        },
        MuiSelect: {
            defaultProps: {
                variant: "standard" as "standard"
            },
        },
        MuiTextField: {
            defaultProps: {
                variant: "standard" as "standard"
            },
        },
        MuiFormControl: {
            defaultProps: {
                variant: "standard" as "standard"
            },
        },
        MuiAlert: {
            defaultProps: {
                variant: "filled" as "filled",
                elevation: 6
            },
        },
        MuiSnackbar: {
            defaultProps: {
                anchorOrigin: { vertical: "bottom" as "bottom", horizontal: "center" as "center" }
            }
        }
    },
});

export const ColorModeContext = createContext({ toggleColorMode: () => {} });
