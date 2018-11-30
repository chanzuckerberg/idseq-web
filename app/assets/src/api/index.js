// TODO(mark): Split this file up as more API methods get added.
import axios from "axios";
import { toPairs } from "lodash/fp";

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

const get = async url => {
  const resp = await axios.get(url);

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

const getSampleMetadata = id => get(`/samples/${id}/metadata`);

const saveSampleMetadata = (id, field, value) =>
  postWithCSRF(`/samples/${id}/save_metadata_v2`, {
    field,
    value
  });

const getMetadataTypes = () => get("/samples/metadata_types");

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

export {
  getSampleMetadata,
  saveSampleMetadata,
  getMetadataTypes,
  saveSampleName,
  saveSampleNotes,
  getAlignmentData,
  getURLParamString,
  deleteSample
};
