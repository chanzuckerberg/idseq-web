// TODO(tiago): this is a minimal port from Samples.jsx with just the necessary refactoring.
import axios from "axios";
import { openUrl } from "~utils/links";
import Cookies from "js-cookie";

export default class ReportsDownloader {
  constructor({
    projectId = "all",
    onDownloadFail = null,
    downloadOption,
    selectedSampleIds
  }) {
    this.projectId = projectId;
    this.selectedSampleIds = Array.from(selectedSampleIds);
    this.onDownloadFail = onDownloadFail;

    this.startReportGeneration({ downloadOption });
  }

  checkReportDownload = ({ statusAction, retrieveAction }) => {
    const url = `/projects/${this.projectId}/${statusAction}`;
    axios
      .get(url)
      .then(result => {
        let downloadStatus = result.data.status_display;
        if (downloadStatus === "complete") {
          openUrl(`/projects/${this.projectId}/${retrieveAction}`);
        } else {
          this.scheduleCheckReportDownload({
            result,
            statusAction,
            retrieveAction
          });
        }
      })
      .catch(() => {
        () => {
          // eslint-disable-next-line no-console
          console.error("ReportsDownloader - Failed report download");
          this.onDownloadFail &&
            this.onDownloadFail({ projectId: this.projectId });
        };
      });
  };

  scheduleCheckReportDownload({ statusAction, retrieveAction }) {
    setTimeout(() => {
      this.checkReportDownload({ statusAction, retrieveAction });
    }, 2000);
  }

  generateReport = ({ makeAction, statusAction, retrieveAction }) => {
    // TODO(tiago): stop using cookies
    const backgroundId = Cookies.get("background_id");
    let queryString = [];
    if (backgroundId) {
      queryString.push(`background_id=${backgroundId}`);
    }
    if (this.selectedSampleIds.length > 0) {
      queryString.push(`sampleIds=${this.selectedSampleIds}`);
    }
    queryString = queryString.join("&");
    let url = `/projects/${this.projectId}/${makeAction}${
      queryString.length > 0 ? `?${queryString}` : ""
    }`;
    axios
      .get(url)
      .then(result => {
        this.checkReportDownload({ result, statusAction, retrieveAction });
      })
      .catch(() => {});
  };

  startReportGeneration = ({ downloadOption }) => {
    switch (downloadOption) {
      case "samples_table": {
        let url = `/projects/${this.projectId}/csv`;
        if (this.selectedSampleIds.length > 0) {
          url += `?sampleIds=${this.selectedSampleIds}`;
        }
        openUrl(url);
        break;
      }
      case "project_reports": {
        this.generateReport({
          makeAction: "make_project_reports_csv",
          statusAction: "project_reports_csv_status",
          retrieveAction: "send_project_reports_csv"
        });
        break;
      }
      case "host_gene_counts": {
        this.generateReport({
          makeAction: "make_host_gene_counts",
          statusAction: "host_gene_counts_status",
          retrieveAction: "send_host_gene_counts"
        });
        break;
      }
      default: {
        // eslint-disable-next-line no-console
        console.error("ReportsDownloader - Download option not set!");
        break;
      }
    }
  };
}
