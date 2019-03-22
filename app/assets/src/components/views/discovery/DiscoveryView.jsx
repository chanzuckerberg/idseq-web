import React from "react";
import PropTypes from "prop-types";
import moment from "moment";
import {
  assign,
  clone,
  compact,
  find,
  findIndex,
  identity,
  keyBy,
  map,
  mapKeys,
  mapValues,
  pick,
  pickBy,
  replace,
  sumBy,
  values,
  xor,
  xorBy
} from "lodash/fp";
import NarrowContainer from "~/components/layout/NarrowContainer";
import { Divider } from "~/components/layout";
import DiscoveryHeader from "../discovery/DiscoveryHeader";
import ProjectsView from "../projects/ProjectsView";
import SamplesView from "../samples/SamplesView";
import VisualizationsView from "../visualizations/VisualizationsView";
import DiscoverySidebar from "./DiscoverySidebar";
import cs from "./discovery_view.scss";
import DiscoveryFilters from "./DiscoveryFilters";
import ProjectHeader from "./ProjectHeader";
import {
  getDiscoverySyncData,
  getDiscoveryDimensions,
  getDiscoverySamples,
  DISCOVERY_DOMAIN_LIBRARY,
  DISCOVERY_DOMAIN_PUBLIC
} from "./discovery_api";

class DiscoveryView extends React.Component {
  constructor(props) {
    super(props);

    this.state = assign(
      {
        currentTab: "projects",
        projectDimensions: [],
        sampleDimensions: [],
        filters: {},
        project: this.props.project,
        projects: [],
        sampleIds: [],
        samples: [],
        samplesAllLoaded: false,
        showFilters: true,
        showStats: true,
        visualizations: []
      },
      history.state
    );

    this.data = null;
    this.updateBrowsingHistory("replace");
  }

  componentDidMount() {
    this.resetData();
    window.onpopstate = () => {
      this.setState(history.state, () => {
        this.resetData();
      });
    };
  }

  updateBrowsingHistory = (action = "push") => {
    const { domain } = this.props;
    const historyState = pick(
      ["currentTab", "filters", "project", "showFilters", "showStats"],
      this.state
    );

    if (action === "push") {
      history.pushState(historyState, `DiscoveryView:${domain}`, `/${domain}`);
    } else {
      history.replaceState(
        historyState,
        `DiscoveryView:${domain}`,
        `/${domain}`
      );
    }
  };

  preparedFilters = () => {
    const { filters } = this.state;
    let preparedFilters = mapKeys(replace("Selected", ""), filters);

    // Time is an exception: we translate values into date ranges
    if (preparedFilters.time) {
      const startDate = {
        "1_week": () => moment().subtract(7, "days"),
        "1_month": () => moment().subtract(1, "months"),
        "3_month": () => moment().subtract(3, "months"),
        "6_month": () => moment().subtract(6, "months"),
        "1_year": () => moment().subtract(1, "years")
      };

      preparedFilters.time = [
        startDate[preparedFilters.time]().format("YYYYMMDD"),
        moment().format("YYYYMMDD")
      ];
    }

    // Taxon is an exception: this filter needs to store complete option, so need to convert to values only
    if (preparedFilters.taxon && preparedFilters.taxon.length) {
      preparedFilters.taxon = map("value", preparedFilters.taxon);
    }

    return preparedFilters;
  };

  resetData = () => {
    const { project } = this.state;
    this.setState(
      {
        projects: compact([project]),
        sampleIds: [],
        samples: [],
        samplesAllLoaded: false,
        visualizations: []
      },
      () => {
        this.refreshAll();
        this.samplesView && this.samplesView.reset();
      }
    );
  };

  refreshSynchronousData = async () => {
    const { domain } = this.props;
    const { project } = this.state;

    const { projects = [], visualizations = [] } = await getDiscoverySyncData({
      domain,
      filters: this.preparedFilters(),
      projectId: project && project.id
    });

    this.setState({
      projects,
      visualizations
    });
  };

  refreshDimensions = async () => {
    const { domain } = this.props;
    const { project } = this.state;

    const {
      projectDimensions,
      sampleDimensions
    } = await getDiscoveryDimensions({
      domain,
      projectId: project && project.id
    });

    this.setState(pickBy(identity, { projectDimensions, sampleDimensions }));
  };

  refreshAll = () => {
    const { project } = this.state;
    !project && this.refreshSynchronousData();
    this.refreshDimensions();
  };

  computeTabs = () => {
    const { project, projects, visualizations } = this.state;

    const renderTab = (label, count) => {
      return (
        <div>
          <span className={cs.tabLabel}>{label}</span>
          <span className={cs.tabCounter}>{count}</span>
        </div>
      );
    };

    return compact([
      !project && {
        label: renderTab("Projects", (projects || []).length),
        value: "projects"
      },
      {
        label: renderTab("Samples", sumBy("number_of_samples", projects)),
        value: "samples"
      },
      !project && {
        label: renderTab("Visualizations", (visualizations || []).length),
        value: "visualizations"
      }
    ]);
  };

  handleTabChange = currentTab => {
    this.setState({ currentTab });
  };

  handleFilterChange = selectedFilters => {
    this.setState({ filters: selectedFilters }, () => {
      this.updateBrowsingHistory("replace");
      this.resetData();
    });
  };

  handleSearchSelected = ({ key, value, text }) => {
    const {
      currentTab,
      filters,
      projectDimensions,
      sampleDimensions
    } = this.state;
    const dimensions = {
      projects: projectDimensions,
      samples: sampleDimensions
    }[currentTab];

    let newFilters = clone(filters);
    const selectedKey = `${key}Selected`;
    let filtersChanged = false;
    if (key === "taxon") {
      newFilters[selectedKey] = xorBy(
        "value",
        [{ value, text }],
        newFilters[selectedKey]
      );
      filtersChanged = true;
    } else {
      const dimension = find({ dimension: key }, dimensions);
      // TODO(tiago): currently we check if it is a valid option. We should (preferably) change server endpoint
      // to filter by project/sample set or at least provide feedback to the user in else branch
      if (dimension && find({ value }, dimension.values)) {
        newFilters[selectedKey] = xor([value], newFilters[selectedKey]);
        filtersChanged = true;
      }
    }
    if (filtersChanged) {
      this.setState({ filters: newFilters }, () => {
        this.updateBrowsingHistory("replace");
        this.resetData();
      });
    }
  };

  handleFilterToggle = () => {
    this.setState({ showFilters: !this.state.showFilters });
  };

  handleStatsToggle = () => {
    this.setState({ showStats: !this.state.showStats });
  };

  handleLoadSampleRows = async ({ startIndex, stopIndex }) => {
    const { domain } = this.props;
    const { project, samples, sampleIds, samplesAllLoaded } = this.state;

    const previousLoadedSamples = samples.slice(startIndex, stopIndex + 1);
    const neededStartIndex = Math.max(startIndex, samples.length);

    let newlyFetchedSamples = [];
    if (!samplesAllLoaded && stopIndex >= neededStartIndex) {
      const numRequestedSamples = stopIndex - neededStartIndex + 1;
      let {
        samples: fetchedSamples,
        sampleIds: fetchedSampleIds
      } = await getDiscoverySamples({
        domain,
        filters: this.preparedFilters(),
        projectId: project && project.id,
        limit: stopIndex - neededStartIndex + 1,
        offset: neededStartIndex,
        listAllIds: sampleIds.length == 0
      });

      let newState = {
        // add newly fetched samples to the list (assumes that samples are requested in order)
        samples: samples.concat(fetchedSamples),
        // if returned samples are less than requested, we assume all data was loaded
        samplesAllLoaded: fetchedSamples.length < numRequestedSamples
      };
      if (fetchedSampleIds) {
        newState.sampleIds = fetchedSampleIds;
      }

      this.setState(newState);
      newlyFetchedSamples = fetchedSamples;
    }

    return previousLoadedSamples.concat(newlyFetchedSamples);
  };

  handleProjectSelected = ({ project }) => {
    this.setState(
      {
        currentTab: "samples",
        project
      },
      () => {
        this.updateBrowsingHistory();
        this.resetData();
      }
    );
  };

  handleProjectUpdated = ({ project }) => {
    const { projects } = this.state;
    const projectIndex = findIndex({ id: project.id }, projects);
    let newProjects = projects.slice();
    newProjects.splice(projectIndex, 1, project);
    this.setState({
      project,
      projects: newProjects
    });
  };

  render() {
    const {
      currentTab,
      projectDimensions,
      sampleDimensions,
      filters,
      project,
      projects,
      sampleIds,
      samples,
      showFilters,
      showStats,
      visualizations
    } = this.state;

    const tabs = this.computeTabs();

    let dimensions = {
      projects: projectDimensions,
      samples: sampleDimensions
    }[currentTab];

    const filterCount = sumBy(
      filters => (Array.isArray(filters) ? filters.length : !filters ? 0 : 1),
      values(filters)
    );

    return (
      <div className={cs.layout}>
        <div className={cs.headerContainer}>
          {project && (
            <ProjectHeader
              project={project}
              fetchedSamples={samples}
              onProjectUpdated={this.handleProjectUpdated}
            />
          )}
          <DiscoveryHeader
            currentTab={currentTab}
            tabs={tabs}
            onTabChange={this.handleTabChange}
            filterCount={filterCount}
            onFilterToggle={this.handleFilterToggle}
            onStatsToggle={this.handleStatsToggle}
            onSearchResultSelected={this.handleSearchSelected}
            showStats={showStats}
            showFilters={showFilters}
          />
        </div>
        <Divider style="medium" />
        <div className={cs.mainContainer}>
          <div className={cs.leftPane}>
            {showFilters && (
              <DiscoveryFilters
                {...mapValues(
                  dim => dim.values,
                  keyBy("dimension", dimensions)
                )}
                {...filters}
                onFilterChange={this.handleFilterChange}
              />
            )}
          </div>
          <div className={cs.centerPane}>
            <NarrowContainer className={cs.viewContainer}>
              {currentTab == "projects" && (
                <ProjectsView
                  projects={projects}
                  onProjectSelected={this.handleProjectSelected}
                />
              )}
              {currentTab == "samples" && (
                <SamplesView
                  ref={samplesView => (this.samplesView = samplesView)}
                  onLoadRows={this.handleLoadSampleRows}
                  samples={samples}
                  selectableIds={sampleIds}
                />
              )}
              {currentTab == "visualizations" && (
                <VisualizationsView visualizations={visualizations} />
              )}
            </NarrowContainer>
          </div>
          <div className={cs.rightPane}>
            {showStats &&
              ["samples", "projects"].includes(currentTab) && (
                <DiscoverySidebar
                  className={cs.sidebar}
                  samples={samples}
                  projects={projects}
                  currentTab={currentTab}
                />
              )}
          </div>
        </div>
      </div>
    );
  }
}

DiscoveryView.propTypes = {
  domain: PropTypes.oneOf([DISCOVERY_DOMAIN_LIBRARY, DISCOVERY_DOMAIN_PUBLIC])
    .isRequired,
  project: PropTypes.object
};

export default DiscoveryView;
