// TODO(mark): Split this file up as more API methods get added.
import axios from "axios";
import { toPairs } from "lodash/fp";
import { cleanFilePath } from "~utils/sample";

const postWithCSRF = async (url, params) => {
  const resp = await axios.post(url, {
    ...params,
    // Fetch the CSRF token from the DOM.
    authenticity_token: document.getElementsByName("csrf-token")[0].content
  });

  // Just return the data.
  // resp also contains headers, status, etc. that we might use later.
  return resp.data;
};

// TODO: add error handling
const get = async (url, config) => {
  const resp = await axios.get(url, config);
  return resp.data;
};

const deleteWithCSRF = url =>
  axios.delete(url, {
    data: {
      // Fetch the CSRF token from the DOM.
      authenticity_token: document.getElementsByName("csrf-token")[0].content
    }
  });

const getURLParamString = params =>
  toPairs(params)
    .map(pair => pair.join("="))
    .join("&");

const getSampleMetadata = (id, pipelineVersion) => {
  return get(
    pipelineVersion
      ? `/samples/${id}/metadata?pipeline_version=${pipelineVersion}`
      : `/samples/${id}/metadata`
  );
};

// Get MetadataField info for the sample(s) (either one ID or an array)
const getSampleMetadataFields = ids =>
  get("/samples/metadata_fields", {
    params: {
      sampleIds: [ids].flat()
    }
  });

const saveSampleMetadata = (id, field, value) =>
  postWithCSRF(`/samples/${id}/save_metadata_v2`, {
    field,
    value
  });

const getMetadataTypesByHostGenomeName = () =>
  get("/samples/metadata_types_by_host_genome_name");

// Save fields on the sample model (NOT sample metadata)
const saveSampleField = (id, field, value) =>
  postWithCSRF(`/samples/${id}/save_metadata`, {
    field,
    value
  });

const saveSampleName = (id, name) => saveSampleField(id, "name", name);

const saveSampleNotes = (id, sampleNotes) =>
  saveSampleField(id, "sample_notes", sampleNotes);

const getAlignmentData = (sampleId, alignmentQuery, pipelineVersion) =>
  get(
    `/samples/${sampleId}/alignment_viz/${alignmentQuery}.json?pipeline_version=${pipelineVersion}`
  );

const deleteSample = id => deleteWithCSRF(`/samples/${id}.json`);

const getSampleReportInfo = (id, params) =>
  get(`/samples/${id}/report_info${params}`);

const getSummaryContigCounts = (id, minContigSize) =>
  get(`/samples/${id}/summary_contig_counts?min_contig_size=${minContigSize}`);

// Send a request to create a single sample. Does not upload the files.
// sourceType can be "local" or "s3".
const createSample = (
  sampleName,
  projectName,
  hostId,
  inputFiles,
  sourceType,
  preloadResultsPath = "",
  alignmentConfig = "",
  pipelineBranch = "",
  dagVariables = "{}",
  maxInputFragments = "",
  subsample = ""
) =>
  new Promise((resolve, reject) => {
    const fileAttributes = Array.from(inputFiles, file => {
      if (sourceType === "local") {
        return {
          source_type: sourceType,
          source: cleanFilePath(file.name),
          parts: cleanFilePath(file.name)
        };
      } else {
        return {
          source_type: sourceType,
          source: file
        };
      }
    });

    axios
      .post("/samples.json", {
        sample: {
          name: sampleName,
          project_name: projectName,
          host_genome_id: hostId,
          input_files_attributes: fileAttributes,
          status: "created",
          client: "web",

          // Admin options
          s3_preload_result_path: preloadResultsPath,
          alignment_config_name: alignmentConfig,
          pipeline_branch: pipelineBranch,
          dag_vars: dagVariables,
          max_input_fragments: maxInputFragments,
          subsample: subsample
        },
        authenticity_token: document.getElementsByName("csrf-token")[0].content
      })
      .then(response => {
        resolve(response);
      })
      .catch(error => {
        reject(error);
      });
  });

const validateMetadataCSVForProject = (id, metadata) =>
  postWithCSRF(`/projects/${id}/validate_metadata_csv`, {
    metadata
  });

const uploadMetadataForProject = (id, metadata) =>
  postWithCSRF(`/projects/${id}/upload_metadata`, {
    metadata
  });

export {
  get,
  getSampleMetadata,
  getSampleMetadataFields,
  getSampleReportInfo,
  saveSampleMetadata,
  getMetadataTypesByHostGenomeName,
  saveSampleName,
  saveSampleNotes,
  getAlignmentData,
  getURLParamString,
  deleteSample,
  getSummaryContigCounts,
  createSample,
  validateMetadataCSVForProject,
  uploadMetadataForProject
};
