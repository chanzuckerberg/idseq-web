export const NO_TARGET_PROJECT_ERROR =
  "Please select an IDseq project to upload your samples to.";

export const NO_VALID_SAMPLES_FOUND_ERROR = "No valid samples were found.";

export const SELECT_ID_KEY = "_selectId";

export const CG_WETLAB_OPTIONS = [
  {
    text: "ARTIC v3",
    value: "artic",
  },
  {
    text: "ARTIC v3 - Short Amplicons (275 bp)",
    value: "artic_short_amplicons",
  },
  {
    text: "MSSPE",
    value: "msspe",
  },
  {
    text: "Combined MSSPE & ARTIC v3",
    value: "combined_msspe_artic",
  },
  {
    text: "SNAP",
    value: "snap",
  },
  {
    text: "AmpliSeq",
    value: "ampliseq",
  },
];

export const CG_TECHNOLOGY_OPTIONS = {
  ILLUMINA: "Illumina",
  NANOPORE: "ONT",
};

export const TEMP_DEFAULT_NANOPORE_WETLAB_OPTION = "artic";

export const DEFAULT_MEDAKA_MODEL_OPTION = "r941_min_high_g360";

export const MEDAKA_MODEL_OPTIONS = {
  DEFAULT: {
    displayName: "default",
    options: [
      {
        text: "r941_min_high_g360",
        value: "r941_min_high_g360",
        subtext:
          "Pore: r941, Instrument: minION or gridION, Basecaller Method: High, Version: g/360",
      },
    ],
  },
  MINION_GRIDION: {
    displayName: "minION or gridION",
    options: [
      {
        text: "r941_min_fast_g303",
        value: "r941_min_fast_g303",
        subtext:
          "Pore: r941, Instrument: minION or gridION, Basecaller Method: Fast, Version: g/303",
      },
      {
        text: "r941_min_high_g303",
        value: "r941_min_high_g303",
        subtext:
          "Pore: r941, Instrument: minION or gridION, Basecaller Method: High, Version: g/303",
      },
      {
        text: "r941_min_high_g330",
        value: "r941_min_high_g330",
        subtext:
          "Pore: r941, Instrument: minION or gridION, Basecaller Method: High, Version: g/330",
      },
      {
        text: "r941_min_high_g340_rle",
        value: "r941_min_high_g340_rle",
        subtext:
          "Pore: r941, Instrument: minION or gridION, Basecaller Method: High, Version: g/340",
      },
      {
        text: "r941_min_high_g344",
        value: "r941_min_high_g344",
        subtext:
          "Pore: r941, Instrument: minION or gridION, Basecaller Method: High, Version: g/344",
      },
      {
        text: "r941_min_high_g351",
        value: "r941_min_high_g351",
        subtext:
          "Pore: r941, Instrument: minION or gridION, Basecaller Method: High, Version: g/351",
      },
    ],
  },
  PROMETHION: {
    displayName: "promethION",
    options: [
      {
        text: "r103_prom_high_g360",
        value: "r103_prom_high_g360",
        subtext:
          "Pore: r103, Instrument: promethION, Basecaller Method: High, Version: g/",
      },
      {
        text: "r103_prom_snp_g3210",
        value: "r103_prom_snp_g3210",
        subtext:
          "Pore: r103, Instrument: promethION, Basecaller Method: SNP, Version: g/3210",
      },
      {
        text: "r103_prom_variant_g3210",
        value: "r103_prom_variant_g3210",
        subtext:
          "Pore: r103, Instrument: promethION, Basecaller Method: Variant, Version: g/3210",
      },
      {
        text: "r941_prom_fast_g303",
        value: "r941_prom_fast_g303",
        subtext:
          "Pore: r941, Instrument: promethION, Basecaller Method: Fast, Version: g/303",
      },
      {
        text: "r941_prom_high_g303",
        value: "r941_prom_high_g303",
        subtext:
          "Pore: r941, Instrument: promethION, Basecaller Method: High, Version: g/303",
      },
      {
        text: "r941_prom_high_g330",
        value: "r941_prom_high_g330",
        subtext:
          "Pore: r941, Instrument: promethION, Basecaller Method: High, Version: g/330",
      },
      {
        text: "r941_prom_high_g344",
        value: "r941_prom_high_g344",
        subtext:
          "Pore: r941, Instrument: promethION, Basecaller Method: High, Version: g/344",
      },
      {
        text: "r941_prom_high_g360",
        value: "r941_prom_high_g360",
        subtext:
          "Pore: r941, Instrument: promethION, Basecaller Method: High, Version: g/360",
      },
      {
        text: "r941_prom_high_g4011",
        value: "r941_prom_high_g4011",
        subtext:
          "Pore: r941, Instrument: promethION, Basecaller Method: High, Version: g/4011",
      },
      {
        text: "r941_prom_snp_g303",
        value: "r941_prom_snp_g303",
        subtext:
          "Pore: r941, Instrument: promethION, Basecaller Method: SNP, Version: g/303",
      },
      {
        text: "r941_prom_snp_g322",
        value: "r941_prom_snp_g322",
        subtext:
          "Pore: r941, Instrument: promethION, Basecaller Method: SNP, Version: g/322",
      },
      {
        text: "r941_prom_snp_g360",
        value: "r941_prom_snp_g360",
        subtext:
          "Pore: r941, Instrument: promethION, Basecaller Method: SNP, Version: g/360",
      },
      {
        text: "r941_prom_variant_g303",
        value: "r941_prom_variant_g303",
        subtext:
          "Pore: r941, Instrument: promethION, Basecaller Method: Variant, Version: g/303",
      },
      {
        text: "r941_prom_variant_g322",
        value: "r941_prom_variant_g322",
        subtext:
          "Pore: r941, Instrument: promethION, Basecaller Method: Variant, Version: g/322",
      },
      {
        text: "r941_prom_variant_g360",
        value: "r941_prom_variant_g360",
        subtext:
          "Pore: r941, Instrument: promethION, Basecaller Method: Variant, Version: g/360",
      },
    ],
  },
};
