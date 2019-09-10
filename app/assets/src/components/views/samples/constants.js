import { keys } from "lodash/fp";

const DOC_LINK =
  "https://github.com/chanzuckerberg/idseq-dag/wiki/IDseq-Pipeline-Stage-%233:-Reporting-and-Visualization#samples-table";

export const SAMPLE_TABLE_COLUMNS_V2 = {
  sample: {
    tooltip: `Information about the sample, including the user-defined sample name,
      its current pipeline status, the user who uploaded it, and the project
      it belongs to.`,
  },
  createdAt: {
    tooltip: "The date on which the sample was initially uploaded to IDseq.",
  },
  host: {
    tooltip: `User-selected organism from which this sample was collected; this
      value is selected by the user at sample upload and dictates which
      genomes are used for initial host subtraction pipeline steps.`,
    link: DOC_LINK,
  },
  collectionLocationV2: {
    tooltip: "User-defined location from which the sample was collected.",
  },
  totalReads: {
    tooltip: "The total number of reads uploaded.",
  },
  nonHostReads: {
    tooltip: `The percentage of reads that came out of step (8) of the host filtration
    and QC steps as compared to what went in at step (1).`,
    link: DOC_LINK,
  },
  qcPercent: {
    tooltip: `The percentage of reads that came out of PriceSeq, step (3) of the host
    filtration and QC steps, compared to what went in to Trimmomatic, step (2).`,
    link: DOC_LINK,
  },
  duplicateCompressionRatio: {
    tooltip: `Duplicate Compression Ratio is the ratio of sequences present prior to
    running cd-hit-dup (duplicate removal) vs after duplicate removal.
    High values indicate the presence of more duplicate reads, indicating lower
    library complexity.`,
    link: DOC_LINK,
  },
  erccReads: {
    tooltip: `The total number of reads aligning to ERCC (External RNA Controls
      Consortium) sequences.`,
    link: DOC_LINK,
  },
  notes: {
    tooltip: "User-supplied notes.",
  },
  nucleotideType: {
    tooltip:
      "User-selected metadata field indicating the nucleotide type (RNA, DNA).",
  },
  sampleType: {
    tooltip: "User-supplied metadata field indicating the sample type.",
  },
  subsampledFraction: {
    tooltip: `After host filtration and QC, the remaining reads are subsampled to 1
    million fragments (2 million paired reads). This field indicates the ratio of
    subsampled reads to total reads passing host filtration and QC steps.`,
    link: DOC_LINK,
  },
  totalRuntime: {
    tooltip: `The total time required by the IDseq pipeline to process .fastq files into
    IDseq reports.`,
  },
};

// deprecated
export const SAMPLE_TABLE_COLUMNS = {
  total_reads: {
    display_name: "Total reads",
    type: "pipeline_data",
  },
  nonhost_reads: {
    display_name: "Passed filters",
    type: "pipeline_data",
  },
  total_ercc_reads: {
    display_name: "ERCC reads",
    type: "pipeline_data",
  },
  fraction_subsampled: {
    display_name: "Subsampled fraction",
    type: "pipeline_data",
  },
  quality_control: {
    display_name: "Passed QC",
    tooltip: "Passed quality control",
    type: "pipeline_data",
  },
  compression_ratio: {
    display_name: "DCR",
    tooltip: "Duplicate compression ratio",
    type: "pipeline_data",
  },
  pipeline_status: {
    display_name: "Status",
    type: "pipeline_data",
  },
  nucleotide_type: {
    display_name: "Nucleotide type",
    type: "metadata",
  },
  collection_location: {
    display_name: "Collection Location",
    type: "metadata",
  },
  host_genome: {
    display_name: "Host",
    type: "sampleMetadata",
  },
  sample_type: {
    display_name: "Sample type",
    type: "metadata",
  },
  notes: {
    display_name: "Notes",
    type: "sampleMetadata",
  },
};

export const INITIAL_COLUMNS = [
  "total_reads",
  "nonhost_reads",
  "quality_control",
  "compression_ratio",
  "host_genome",
  "collection_location",
  "pipeline_status",
];

export const ALL_COLUMNS = keys(SAMPLE_TABLE_COLUMNS);
