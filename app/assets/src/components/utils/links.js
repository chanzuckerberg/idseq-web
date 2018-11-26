const openUrl = (link, currentEvent) => {
  // currentEvent is optional and it is used to consider
  // modifiers like CMD and CTRL key to open urls in new tabs
  let openInNewTab = false;

  // metakey is CMD in mac
  if (currentEvent && (currentEvent.metaKey || currentEvent.ctrlKey)) {
    openInNewTab = true;
  }

  if (openInNewTab) {
    window.open(link, "_blank", "noopener", "noreferrer");
  } else {
    location.href = link;
  }
};

const downloadStringToFile = str => {
  let file = new Blob([str], { type: "text/plain" });
  let download_url = URL.createObjectURL(file);
  location.href = `${download_url}`;
};

export { openUrl, downloadStringToFile };
