import "@testing-library/jest-dom";
import React from "react";

jest.mock("@react-pdf/renderer", () => ({
  StyleSheet: {
    create: <T extends Record<string, unknown>>(styles: T) => styles,
  },
  Document: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
  Page: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
  View: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", null, children),
  Text: ({ children }: { children: React.ReactNode }) =>
    React.createElement("span", null, children),
  PDFDownloadLink: ({
    children,
    fileName,
  }: {
    children: React.ReactNode | ((state: { loading: boolean }) => React.ReactNode);
    fileName?: string;
  }) => {
    const content = typeof children === "function" ? children({ loading: false }) : children;

    return React.createElement("a", { href: "#", download: fileName }, content);
  },
}));
