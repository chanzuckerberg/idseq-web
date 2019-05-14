import React from "react";
import { Accordion, NarrowContainer } from "~/components/layout";
import cs from "./support.scss";

export default class FAQPage extends React.Component {
  render() {
    return (
      <NarrowContainer className={cs.faqPage} size="small">
        <div className={cs.title}>
          <h1>Frequently Asked Questions</h1>
        </div>
        <h2>Privacy, Security, and Research</h2>
        <Accordion
          className={cs.question}
          header={<h3>Does IDseq own any of the data I upload to the tool?</h3>}
        >
          <p>
            No. The data you upload into IDseq is yours and so is any research
            you create with it. We don’t own it and will never sell it. You do,
            however, give us limited rights to use it for the IDSeq service.
          </p>
        </Accordion>
        <Accordion
          className={cs.question}
          header={<h3>Does IDseq sell the data I upload?</h3>}
        >
          <p>No.</p>
        </Accordion>
        <Accordion
          className={cs.question}
          header={
            <h3>How does IDseq share the data I upload with other users?</h3>
          }
        >
          <p>
            <ul>
              <li>
                When you upload data to IDseq, you control who the data is
                shared with. IDseq relies on three key categories of data, and
                we want you to understand how each is treated.{" "}
                <b>Upload Data</b> refers to the original fastq sequence files
                you upload into IDseq-- this data will only be available to you,
                the uploader, no matter who you add to the project.{" "}
                <b>Sample Metadata</b> includes details about the sample that
                researchers manually enter, such as when and where a sample was
                collected and its type (e.g. synovial fluid or cerebrospinal
                fluid). <b>Report Data</b> includes the pathogen report IDseq
                generates from the Upload Data, Sample Metadata, and other data
                derived from the Upload, such as phylogenetic trees.
              </li>
              <li>
                <b>Report Data</b> and <b>Sample Metadata</b> will be shared
                with anyone you share your project with.
              </li>
              <li>
                Unless you choose to remove it <b>one year</b> after you
                uploaded your sample, Report Data and the Sample Metadata
                uploaded alongside it will be shared with <b>all IDseq users</b>.
                We will notify and remind you of this sharing of the Report Data
                and Sample Metadata before the one year anniversary of your
                upload by sending you a message to the contact information you
                provided to us at registration.
              </li>
            </ul>
          </p>
        </Accordion>
        <Accordion
          className={cs.question}
          header={
            <h3>Will IDseq use my Upload Data to write research papers?</h3>
          }
        >
          <p>No, we will not.</p>
        </Accordion>
        <Accordion
          className={cs.question}
          header={<h3>How is human genomic data handled and protected?</h3>}
        >
          <p>
            <ul>
              <li>
                You should not be able to find any human sequence data in IDseq
                other than the original fastq files you yourself have uploaded.
                This is because we have a multi-step process in place to filter
                out and remove host sequence data in order to generate Reports.
                If you are able to find human sequence data elsewhere in IDseq,
                please let us know at{" "}
                <a href="mailto:privacy@idseq.net">privacy@idseq.net</a>, and we
                will remove it. The fastq files you uploaded are only available
                to you, the uploader.
              </li>
              <li>
                For the fastq files you yourself have uploaded, we understand
                this data is sensitive and we implement security measures
                designed to safeguard it. We seek to implement security best
                practices like encrypting data, hosting it on leading cloud
                providers with robust physical security, regular security
                assessments, data loss prevention systems, and working to ensure
                that only authorized staff have access to the data. If you need
                more information about our security practices please contact us
                at <a href="mailto:security@idseq.net">security@idseq.net</a>.
              </li>
            </ul>
          </p>
        </Accordion>
        <Accordion
          className={cs.question}
          header={<h3>Can I use IDseq for clinical diagnostic purposes?</h3>}
        >
          <p>
            No. IDseq is for research use only. It is not for diagnostic,
            clinical or commercial use.
          </p>
        </Accordion>
        <Accordion
          className={cs.question}
          header={
            <h3>What should I think about before uploading data to IDseq?</h3>
          }
        >
          <p>
            You should make sure you have any permissions or consents necessary
            in order to upload the samples to IDseq. Please check with your
            institution or organization if you have questions about meeting this
            responsibility.
          </p>
        </Accordion>
        <Accordion
          className={cs.question}
          header={
            <h3>
              What Metadata about the uploaded samples do you collect, and how
              do you make sure the metadata is non-identifiable?
            </h3>
          }
        >
          <p>
            <ul>
              <li>
                We require 4 metadata fields for uploaded samples. We believe
                these data are necessary to fully analyze the data. The 4 fields
                we require are:
                <li className={cs.innerListItem}>
                  1. Sample type (CSF, Stool, Serum, etc)
                </li>
                <li className={cs.innerListItem}>
                  2. Nucleotide type (RNA or DNA)
                </li>
                <li className={cs.innerListItem}>
                  3. Location (limited to state or country)
                </li>
                <li className={cs.innerListItem}>
                  4. Collection Date (limited to month and year)
                </li>
              </li>
              <li>
                We limit the granularity of location and collection date to help
                maintain the anonymity of the uploaded data.
              </li>
              <li>
                Other metadata can be uploaded to IDseq but is not required and
                may be deleted at any point. We have put together a metadata
                ontology that you can find{" "}
                <a href="/metadata/dictionary">here</a> that does not include
                any fields where Protected Health Information (PHI) can be
                derived.
              </li>
            </ul>
          </p>
        </Accordion>
        <Accordion
          className={cs.question}
          header={
            <h3>
              Under what circumstances would IDseq transfer rights to the data?
              Why, and what choices would I have?
            </h3>
          }
        >
          <p>
            If we can no longer keep operating IDseq (which we hope won’t
            happen) or believe the community is better served by someone else
            operating it, we will transfer the project and all existing data in
            the tool so that the community can continue to be served. We will
            always let you know before something like this happens, and you will
            have the option to delete your account and any data you’ve uploaded.
          </p>
        </Accordion>
        <Accordion
          className={cs.question}
          header={<h3>Where do I go for more questions?</h3>}
        >
          <p>
            Please contact{" "}
            <a href="mailto:security@idseq.net">security@idseq.net</a> if you
            have any security-related questions or concerns, and{" "}
            <a href="mailto:privacy@idseq.net">privacy@idseq.net</a> if you have
            any other questions about our practices or legal documents.
          </p>
        </Accordion>
        <Accordion
          className={cs.question}
          header={<h3>What is your address?</h3>}
        >
          <p>
            <ul>
              <li>
                Chan Zuckerberg Biohub, 499 Illinois Street, Fourth Floor San
                Francisco, CA 94158
              </li>
              <li>
                Chan Zuckerberg Initiative, LLC, 601 Marshall St., Redwood City,
                CA 94063
              </li>
            </ul>
          </p>
        </Accordion>
        <Accordion
          className={cs.question}
          header={
            <h3>Which Third Party Vendors Will Get Access to My Data?</h3>
          }
        >
          <p>
            We rely on service providers to help us provide and improve the
            service, including Chan Zuckerberg Initiative our technology
            partner. In our terms with third party service providers, we work
            with service providers to secure data from unauthorized access and
            use and limit their use of data to providing and improving relevant
            services that we use. If you have more questions about our service
            providers, please contact us at{" "}
            <a href="mailto:privacy@idseq.net">privacy@idseq.net</a>.
          </p>
        </Accordion>
      </NarrowContainer>
    );
  }
}
