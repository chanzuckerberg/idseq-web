class PipelineSampleReport extends React.Component {

  constructor(props) {
    super(props);
    this.report_details = props.report_details;
    this.rows_passing_filters = props.taxonomy_details[0];
    this.rows_total = props.taxonomy_details[1];
    this.taxonomy_details = props.taxonomy_details[2];
    this.all_genera_in_sample = props.all_genera_in_sample;
    this.all_categories = props.all_categories;
    this.applyNewFilterThresholds = this.applyNewFilterThresholds.bind(this);
    this.applyExcludedCategories = this.applyExcludedCategories.bind(this);
    this.applyGenusFilter = this.applyGenusFilter.bind(this);
    this.expandOrCollapseGenus = this.expandOrCollapseGenus.bind(this);
    this.expandTable = this.expandTable.bind(this);
    this.collapseTable = this.collapseTable.bind(this);
    this.disableFilters = this.disableFilters.bind(this);
    this.enableFilters = this.enableFilters.bind(this);
  }

  refreshPage(overrides) {
    new_params = Object.assign({}, this.props.report_page_params, overrides);
    window.location = location.protocol + '//' + location.host + location.pathname + '?' + jQuery.param(new_params);
  }

  disableFilters() {
    disable_filters = 1;
    this.refreshPage({disable_filters});
  }

  enableFilters() {
    disable_filters = 0;
    this.refreshPage({disable_filters});
  }

  // applySort needs to be bound at time of use, not in constructor above
  applySort(sort_by) {
    this.refreshPage({sort_by});
  }

  applyNewFilterThresholds(new_filter_thresholds) {
    this.refreshPage(new_filter_thresholds);
  }

  applyExcludedCategories(category, checked) {
    excluded_categories = "" + this.props.report_page_params.excluded_categories;
    if (checked) {
      // remove from excluded_categories
      excluded_categories = excluded_categories.split(",").filter(c => c != category).join(",");
    } else {
      // add to excluded_categories
      excluded_categories = excluded_categories + "," + category;
    }
    this.refreshPage({excluded_categories});
  }

  applyGenusFilter(selected_genus) {
    this.refreshPage({selected_genus});
  }

  isGenusSearch() {
    params = this.props.report_page_params;
    return params.selected_genus != 'None' && params.disable_filters != 1;
  }

  //path to NCBI 
  gotoNCBI(e) {
    const taxId = e.target.getAttribute('data-tax-id');
    const ncbiLink = `https://www.ncbi.nlm.nih.gov/Taxonomy/Browser/wwwtax.cgi?mode=Info&id=${taxId}`;
    window.open(ncbiLink, '_blank');
  }

  //download Fasta  
  downloadFastaUrl(e) {
    const pipelineId = e.target.getAttribute('data-pipeline-id');
    const taxLevel = e.target.getAttribute('data-tax-level');
    const taxId = e.target.getAttribute('data-tax-id');
    console.log(pipelineId, taxLevel, taxId, 'fasta params');
    location.href = `/pipeline_outputs/${pipelineId}/fasta/${taxLevel}/${taxId}/NT_or_NR`;
  }

  displayTags(taxInfo, reportDetails) {
    return (
      <span className="link-tag">
        <i data-tax-id={taxInfo.tax_id} onClick={this.gotoNCBI} className="fa fa-link cloud" aria-hidden="true"></i>
        { taxInfo.tax_id > 0 && reportDetails.taxon_fasta_flag ? <i data-pipeline-id={reportDetails.pipeline_info.id} 
        data-tax-level={taxInfo.tax_level} data-tax-id={taxInfo.tax_id}
        onClick={this.downloadFastaUrl} className="fa fa-download cloud" aria-hidden="true"></i> : null }
      </span>
    )
  }

  render_name(tax_info, report_details) {
    let foo = <i>{tax_info.name}</i>;
    if (tax_info.tax_id > 0) {
      if (report_details.taxon_fasta_flag) {
        foo = <span className="link"><a>{tax_info.name}</a></span>
      } else {
        foo = <span>{tax_info.name}</span>
      }
    }
    if (tax_info.tax_level == 1) {
      // indent species rows
      foo = <div className="hover-wrapper">
          <div className='species-name'>{foo}
          { this.displayTags(tax_info, report_details) }
        </div>
      </div>;
    } else {
      // emphasize genus, soften category and species count
      category_name = tax_info.tax_id == -200 ? '' : tax_info.category_name;
      // Most groups are initially expanded, so they get a toggle with fa-minus initial state.
      fake_or_real = tax_info.genus_taxid < 0 ? 'fake-genus' : 'real-genus';
      right_arrow_initial_visibility = this.isGenusSearch() ? 'hidden' : '';
      down_arrow_initial_visibility = this.isGenusSearch() ? '' : 'hidden';
      plus_or_minus = <span>
        <span className={`report-arrow-down report-arrow ${tax_info.tax_id} ${fake_or_real} ${down_arrow_initial_visibility}`}>
          <i className={`fa fa-angle-down ${tax_info.tax_id}`} onClick={this.expandOrCollapseGenus}></i>
        </span>
        <span className={`report-arrow-right report-arrow ${tax_info.tax_id} ${fake_or_real} ${right_arrow_initial_visibility}`}>
          <i className={`fa fa-angle-right ${tax_info.tax_id}`} onClick={this.expandOrCollapseGenus}></i>
        </span>
      </span>;
      foo = <div className="hover-wrapper">
              <div className='genus-name'> {plus_or_minus} {foo}</div>
            <i className='count-info'>({tax_info.species_count} {category_name} species)</i>
            { this.displayTags(tax_info, report_details) }
        </div>;
    }
    return foo;
  }

  render_number(x, emphasize, num_decimals) {
    const is_blank = (x == 0) || (x == -100);
    y = Number(x);
    y = y.toFixed(num_decimals);
    y = numberWithCommas(y);
    if (emphasize) {
      y = <b>{y}</b>;
    }
    className = is_blank ? 'report-number-blank' : 'report-number';
    return ( <td className={className}>{y}</td> );
  }

  render_sort_arrow(column, desired_sort_direction, arrow_direction) {
    desired_sort = desired_sort_direction + "_" + column;
    className = `fa fa-caret-${arrow_direction}`;
    current_sort = this.props.report_page_params.sort_by;
    if (current_sort == desired_sort) {
      className = 'active ' + className;
    }
    return (
      <i onClick={this.applySort.bind(this, desired_sort)}
         className={className}
         key = {desired_sort}>
      </i>
    );
  }

  render_column_header(visible_type, visible_metric, column_name) {
    var style = { 'textAlign': 'right' };
    return (
      <th style={style}>
        <div className='sort-controls right'>
          {this.render_sort_arrow(column_name, 'lowest', 'up')}
          {this.render_sort_arrow(column_name, 'highest', 'down')}
          {visible_type}<br/>
          {visible_metric}
        </div>
      </th>
    );
  }

  row_class(tax_info) {
    if (tax_info.tax_level == 2) {
      if (tax_info.tax_id < 0) {
        return `report-row-genus ${tax_info.genus_taxid} fake-genus`;
      } else {
        return `report-row-genus ${tax_info.genus_taxid} real-genus`;
      }
    }
    initial_visibility = this.isGenusSearch() ? '' : 'hidden';
    if (tax_info.genus_taxid < 0) {
      return `report-row-species ${tax_info.genus_taxid} fake-genus ${initial_visibility}`;
    }
    return `report-row-species ${tax_info.genus_taxid} real-genus ${initial_visibility}`;
  }

  expandOrCollapseGenus(e) {
    // className as set in render_name() is like 'fa fa-angle-right ${taxId}'
    const className = e.target.attributes.class.nodeValue;
    const attr = className.split(' ');
    const taxId = attr[2];
    $(`.report-row-species.${taxId}`).toggleClass('hidden');
    $(`.report-arrow.${taxId}`).toggleClass('hidden');
  }

  expandTable(e) {
    // expand all real genera
    $(`.report-row-species.real-genus`).removeClass('hidden');
    $(`.report-arrow-down.real-genus`).removeClass('hidden');
    $(`.report-arrow-right.real-genus`).addClass('hidden');
    $(`.table-arrow`).toggleClass('hidden');
  }

  collapseTable(e) {
    // collapse all genera (real or negative)
    $(`.report-row-species`).addClass('hidden');
    $(`.report-arrow-down`).addClass('hidden');
    $(`.report-arrow-right`).removeClass('hidden');
    $(`.table-arrow`).toggleClass('hidden');
  }

  //Download report in csv
  downloadReport(id) {
    location.href = `/reports/${id}/csv`
  }

  render() {
    const parts = this.props.report_page_params.sort_by.split("_")
    const sort_column = parts[1] + "_" + parts[2];
    var t0 = Date.now();
    filter_stats = this.rows_passing_filters + ' rows passing filters, out of ' + this.rows_total + ' total rows.';
    if (this.props.report_page_params.disable_filters == 1) {
      filter_stats = this.rows_total + ' unfiltered rows.';
    }
    filter_row_stats = (
      <div>
        <span className="count">
          {this.rows_passing_filters == this.taxonomy_details.length ?
            (filter_stats) :
            ('Due to resource limits, showing only ' + this.taxonomy_details.length + ' of the ' + filter_stats)}
        </span>
        {this.rows_passing_filters < this.rows_total && this.props.report_page_params.disable_filters == 0 ? <span className="disable" onClick={this.disableFilters}><b> Disable filters</b></span> : ''}
        {this.props.report_page_params.disable_filters == 1 ? <span className="disable" onClick={this.enableFilters}><b> Enable filters</b></span> : ''}
      </div>
    );
    report_filter =
      <ReportFilter
        all_categories = { this.all_categories }
        all_genera_in_sample = {  this.all_genera_in_sample }
        background_model = { this.report_details.background_model.name }
        report_title = { this.report_details.report_info.name }
        report_page_params = { this.props.report_page_params }
        applyNewFilterThresholds = { this.applyNewFilterThresholds }
        applyExcludedCategories = { this.applyExcludedCategories }
        applyGenusFilter = { this.applyGenusFilter }
        enableFilters = { this.enableFilters }
      />;
    // To do: improve presentation and place download_button somewhere on report page
    download_button = (
      <span className="download">
        <a className="custom-button download" onClick={this.downloadReport.bind(this, this.report_details.report_info.id)}>
          <i className="fa fa-cloud-download left"></i> Download Report
        </a>
      </span>
    );
    right_arrow_initial_visibility = this.isGenusSearch() ? 'hidden' : '';
    result = (
      <div>
        <div id="reports" className="reports-screen tab-screen col s12">
          <div className="tab-screen-content">
            <div className="row">
              <div className="col s2 reports-sidebar">
                {report_filter}
              </div>
              <div className="col s10 reports-section">
                <div className="reports-count">
                  { download_button }
                  { filter_row_stats }
                </div>
                <div className="row reports-main ">
                  <table id="report-table" className='bordered report-table'>
                    <thead>
                    <tr>
                      <th>
                        <span className={`table-arrow ${right_arrow_initial_visibility}`}>
                          <i className={`fa fa-angle-right`} onClick={this.expandTable}></i>
                        </span>
                        <span className={`table-arrow hidden`}>
                          <i className={`fa fa-angle-down`} onClick={this.collapseTable}></i>
                        </span>
                        Taxonomy
                      </th>
                      { this.render_column_header('NT+NR', 'ZZRPM',  'nt_aggregatescore') }
                      { this.render_column_header('NT', 'Z',   'nt_zscore') }
                      { this.render_column_header('NT', 'rPM', 'nt_rpm')    }
                      { this.render_column_header('NT', 'r',   'nt_r')      }
                      { this.render_column_header('NT', '%id', 'nt_percentidentity')    }
                      { this.render_column_header('NT', 'AL',   'nt_alignmentlength')    }
                      { this.render_column_header('NT', 'Log(1/E)',  'nt_neglogevalue')    }
                      { this.render_column_header('NR', 'Z',   'nr_zscore') }
                      { this.render_column_header('NR', 'rPM', 'nr_rpm')    }
                      { this.render_column_header('NR', 'r',   'nr_r')      }
                      { this.render_column_header('NR', '%id', 'nr_percentidentity')    }
                      { this.render_column_header('NR', 'AL',   'nr_alignmentlength')    }
                      { this.render_column_header('NR', 'Log(1/E)',  'nr_neglogevalue')    }
                    </tr>
                    </thead>
                    <tbody>
                    { this.taxonomy_details.map((tax_info, i) => {
                      return (
                        <tr key={tax_info.tax_id} className={this.row_class(tax_info)}>
                          <td>
                            { this.render_name(tax_info, this.report_details) }
                          </td>
                          { this.render_number(tax_info.NT.aggregatescore, sort_column == 'nt_aggregatescore', 0) }
                          { this.render_number(tax_info.NT.zscore, sort_column == 'nt_zscore', 1) }
                          { this.render_number(tax_info.NT.rpm, sort_column == 'nt_rpm', 1)       }
                          { this.render_number(tax_info.NT.r, sort_column == 'nt_r', 0)           }
                          { this.render_number(tax_info.NT.percentidentity, sort_column == 'nt_percentidentity', 1) }
                          { this.render_number(tax_info.NT.alignmentlength, sort_column == 'nt_alignmentlength', 1)       }
                          { this.render_number(tax_info.NT.neglogevalue, sort_column == 'nt_neglogevalue', 0) }
                          { this.render_number(tax_info.NR.zscore, sort_column == 'nr_zscore', 1) }
                          { this.render_number(tax_info.NR.rpm, sort_column == 'nr_rpm', 1)       }
                          { this.render_number(tax_info.NR.r, sort_column == 'nr_r', 0)           }
                          { this.render_number(tax_info.NR.percentidentity, sort_column == 'nr_percentidentity', 1) }
                          { this.render_number(tax_info.NR.alignmentlength, sort_column == 'nr_alignmentlength', 1)       }
                          { this.render_number(tax_info.NR.neglogevalue, sort_column == 'nr_neglogevalue', 0) }
                        </tr>
                      )
                    })}
                    </tbody>
                  </table>
                </div>
            </div>
            </div>
          </div>
        </div>
      </div>
    );
    t1 = Date.now();
    // console.log(`Table render took ${t1 - t0} milliseconds.`);
    return result;
  }
}
