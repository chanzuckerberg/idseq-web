#!/usr/bin/env python
import os
import sys
import multiprocessing
import subprocess
import json
import csv
import shelve
import argparse
import re
import time
import random
import datetime
import gzip
import logging

INPUT_BUCKET = 's3://czbiohub-infectious-disease/UGANDA'
OUTPUT_BUCKET = 's3://yunfang-workdir/id-uganda'
KEY_S3_PATH = 's3://cdebourcy-test/cdebourcy_7-19-17.pem'
ROOT_DIR = '/mnt'
DEST_DIR = ROOT_DIR + '/idseq/data' # generated data go here
REF_DIR  = ROOT_DIR + '/idseq/ref' # referene genome / ref databases go here

#INPUT_BUCKET = 's3://czbiohub-infectious-disease/UGANDA'
#SAMPLES = ['UGANDA_S30_NP', 'UGANDA_S31_NP', 'UGANDA_S32_NP', 'UGANDA_S33_NP',
#           'UGANDA_S34_NP', 'UGANDA_S35_NP', 'UGANDA_S36_NP', 'UGANDA_S37_NP',
#           'UGANDA_S38_NP', 'UGANDA_S39_NP']
#INPUT_BUCKET = 's3://czbiohub-infectious-disease/background_controls'

# fastqs = INPUT_BUCKET/{sample_id}/*.fastq.gz

STAR="STAR"
HTSEQ="htseq-count"
SAMTOOLS="samtools"
PRICESEQ_FILTER="PriceSeqFilter"
CDHITDUP="cd-hit-dup"
BOWTIE2="bowtie2"


LZW_FRACTION_CUTOFF = 0.45
GSNAPL_INSTANCE_IP = '34.214.24.238'
RAPSEARCH2_INSTANCE_IP = '34.212.195.187'

GSNAPL_MAX_CONCURRENT = 5
RAPSEARCH2_MAX_CONCURRENT = 5

STAR_GENOME = 's3://cdebourcy-test/id-dryrun-reference-genomes/STAR_genome.tar.gz'
BOWTIE2_GENOME = 's3://cdebourcy-test/id-dryrun-reference-genomes/bowtie2_genome.tar.gz'
GSNAPL_GENOME = 's3://cdebourcy-test/id-dryrun-reference-genomes/nt_k16.tar.gz'
ACCESSION2TAXID = 's3://cdebourcy-test/id-dryrun-reference-genomes/accession2taxid.db.gz'
DEUTEROSTOME_TAXIDS = 's3://cdebourcy-test/id-dryrun-reference-genomes/lineages-2017-03-17_deuterostome_taxIDs.txt'
TAXID_TO_INFO = 's3://cdebourcy-test/id-dryrun-reference-genomes/taxon_info.db'

TAX_LEVEL_SPECIES = 1
TAX_LEVEL_GENUS = 2

#output files
STAR_OUT1 = 'unmapped.star.1.fq'
STAR_OUT2 = 'unmapped.star.2.fq'
PRICESEQFILTER_OUT1 = 'priceseqfilter.unmapped.star.1.fq'
PRICESEQFILTER_OUT2 = 'priceseqfilter.unmapped.star.2.fq'
FQ2FA_OUT1 = 'priceseqfilter.unmapped.star.1.fasta'
FQ2FA_OUT2 = 'priceseqfilter.unmapped.star.2.fasta'
CDHITDUP_OUT1 = 'cdhitdup.priceseqfilter.unmapped.star.1.fasta'
CDHITDUP_OUT2 = 'cdhitdup.priceseqfilter.unmapped.star.2.fasta'
LZW_OUT1 = 'lzw.cdhitdup.priceseqfilter.unmapped.star.1.fasta'
LZW_OUT2 = 'lzw.cdhitdup.priceseqfilter.unmapped.star.2.fasta'
BOWTIE2_OUT = 'bowtie2.lzw.cdhitdup.priceseqfilter.unmapped.star.sam'
EXTRACT_UNMAPPED_FROM_SAM_OUT1 = 'unmapped.bowtie2.lzw.cdhitdup.priceseqfilter.unmapped.star.1.fasta'
EXTRACT_UNMAPPED_FROM_SAM_OUT2 = 'unmapped.bowtie2.lzw.cdhitdup.priceseqfilter.unmapped.star.2.fasta'
EXTRACT_UNMAPPED_FROM_SAM_OUT3 = 'unmapped.bowtie2.lzw.cdhitdup.priceseqfilter.unmapped.star.merged.fasta'
GSNAPL_OUT = 'gsnapl.unmapped.bowtie2.lzw.cdhitdup.priceseqfilter.unmapped.star.m8'
ANNOTATE_GSNAPL_M8_WITH_TAXIDS_OUT = 'taxids.gsnapl.unmapped.bowtie2.lzw.cdhitdup.priceseqfilter.unmapped.star.m8'
GENERATE_TAXID_ANNOTATED_FASTA_FROM_M8_OUT = 'taxids.gsnapl.unmapped.bowtie2.lzw.cdhitdup.priceseqfilter.unmapped.star.fasta'
FILTER_DEUTEROSTOME_FROM_TAXID_ANNOTATED_FASTA_OUT = 'filter.deuterostomes.taxids.gsnapl.unmapped.bowtie2.lzw.cdhitdup.priceseqfilter.unmapped.star.fasta'
RAPSEARCH2_OUT = 'rapsearch2.filter.deuterostomes.taxids.gsnapl.unmapped.bowtie2.lzw.cdhitdup.priceseqfilter.unmapped.star.m8'
FILTER_DEUTEROSTOMES_FROM_NT_M8_OUT = 'filter.deuterostomes.taxids.gsnapl.unmapped.bowtie2.lzw.cdhitdup.priceseqfilter.unmapped.star.m8'
NT_M8_TO_TAXID_COUNTS_FILE_OUT = 'counts.filter.deuterostomes.taxids.gsnapl.unmapped.bowtie2.lzw.cdhitdup.priceseqfilter.unmapped.star.csv'
NT_TAXID_COUNTS_TO_JSON_OUT = 'counts.filter.deuterostomes.taxids.gsnapl.unmapped.bowtie2.lzw.cdhitdup.priceseqfilter.unmapped.star.json'
NT_TAXID_COUNTS_TO_SPECIES_RPM_OUT = 'species.rpm.filter.deuterostomes.taxids.gsnapl.unmapped.bowtie2.lzw.cdhitdup.priceseqfilter.unmapped.star.csv'
NT_TAXID_COUNTS_TO_GENUS_RPM_OUT = 'genus.rpm.filter.deuterostomes.taxids.gsnapl.unmapped.bowtie2.lzw.cdhitdup.priceseqfilter.unmapped.star.csv'
ANNOTATE_RAPSEARCH2_M8_WITH_TAXIDS_OUT = 'taxids.rapsearch2.filter.deuterostomes.taxids.gsnapl.unmapped.bowtie2.lzw.cdhitdup.priceseqfilter.unmapped.star.m8'
GENERATE_TAXID_ANNOTATED_FASTA_FROM_RAPSEARCH2_M8_OUT = 'taxids.rapsearch2.filter.deuterostomes.taxids.gsnapl.unmapped.bowtie2.lzw.cdhitdup.priceseqfilter.unmapped.star.fasta'
FILTER_DEUTEROSTOMES_FROM_NR_M8_OUT = 'filter.deuterostomes.taxids.rapsearch2.filter.deuterostomes.taxids.gsnapl.unmapped.bowtie2.lzw.cdhitdup.priceseqfilter.unmapped.star.m8'
NR_M8_TO_TAXID_COUNTS_FILE_OUT = 'counts.filter.deuterostomes.taxids.rapsearch2.filter.deuterostomes.taxids.gsnapl.unmapped.bowtie2.lzw.cdhitdup.priceseqfilter.unmapped.star.csv'
NR_TAXID_COUNTS_TO_JSON_OUT = 'counts.filter.deuterostomes.taxids.rapsearch2.filter.deuterostomes.taxids.gsnapl.unmapped.bowtie2.lzw.cdhitdup.priceseqfilter.unmapped.star.json'
NR_TAXID_COUNTS_TO_SPECIES_RPM_OUT = 'species.rpm.filter.deuterostomes.taxids.rapsearch2.filter.deuterostomes.taxids.gsnapl.unmapped.bowtie2.lzw.cdhitdup.priceseqfilter.unmapped.star.csv'
NR_TAXID_COUNTS_TO_GENUS_RPM_OUT = 'genus.rpm.filter.deuterostomes.taxids.rapsearch2.filter.deuterostomes.taxids.gsnapl.unmapped.bowtie2.lzw.cdhitdup.priceseqfilter.unmapped.star.csv'
COMBINED_JSON_OUT = 'idseq_web_sample.json'
LOGS_OUT = 'log.txt'

### convenience functions
def lzw_fraction(sequence):
    if sequence == "":
        return 0.0
    sequence = sequence.upper()
    dict_size = 0
    dictionary = {}
    # Initialize dictionary with single char
    for c in sequence:
       dict_size += 1
       dictionary[c] = dict_size

    word = ""
    results = []
    for c in sequence:
        wc = word + c
        if dictionary.get(wc):
            word = wc
        else:
            results.append(dictionary[word])
            dict_size += 1
            dictionary[wc] = dict_size
            word = c
    if word != "":
        results.append(dictionary[word])
    return float(len(results))/len(sequence)

def generate_taxid_annotated_fasta_from_m8(input_fasta_file, m8_file, output_fasta_file, annotation_prefix):
    '''Tag reads based on the m8 output'''
    # Example:  generate_annotated_fasta_from_m8('filter.unmapped.merged.fasta',
    #  'bowtie.unmapped.star.gsnapl-nt-k16.m8', 'NT-filter.unmapped.merged.fasta', 'NT')
    # Construct the m8_hash
    read_to_accession_id = {}
    with open(m8_file, 'rb') as m8f:
        for line in m8f:
            if line[0] == '#':
                continue
            parts = line.split("\t")
            read_name = parts[0]
            read_name_parts = read_name.split("/")
            if len(read_name_parts) > 1:
                output_read_name = read_name_parts[0] + '/' + read_name_parts[-1]
            else:
                output_read_name = read_name
            accession_id = parts[1]
            read_to_accession_id[output_read_name] = accession_id
    # Go through the input_fasta_file to get the results and tag reads
    input_fasta_f = open(input_fasta_file, 'rb')
    output_fasta_f = open(output_fasta_file, 'wb')
    sequence_name = input_fasta_f.readline()
    sequence_data = input_fasta_f.readline()
    while len(sequence_name) > 0 and len(sequence_data) > 0:
        read_id = sequence_name.rstrip().lstrip('>')
        accession = read_to_accession_id.get(read_id, '')
        new_read_name = annotation_prefix + ':' + accession + ':' + read_id
        output_fasta_f.write(">%s\n" % new_read_name)
        output_fasta_f.write(sequence_data)
        sequence_name = input_fasta_f.readline()
        sequence_data = input_fasta_f.readline()
    input_fasta_f.close()
    output_fasta_f.close()

def generate_lzw_filtered_paired(fasta_file_1, fast_file_2, output_prefix, cutoff_fraction):
    output_read_1 = open(output_prefix + '.1.fasta', 'wb')
    output_read_2 = open(output_prefix + '.2.fasta', 'wb')
    read_1 = open(fasta_file_1, 'rb')
    read_2 = open(fasta_file_1, 'rb')
    count = 0
    filtered = 0
    while True:
        line_r1_header   = read_1.readline()
        line_r1_sequence = read_1.readline()
        line_r2_header   = read_2.readline()
        line_r2_sequence = read_2.readline()
        if line_r1_header and line_r1_sequence and line_r2_header and line_r2_sequence:
            fraction_1 = lzw_fraction(line_r1_sequence.rstrip())
            fraction_2 = lzw_fraction(line_r2_sequence.rstrip())
            count += 1
            if fraction_1 > cutoff_fraction and fraction_2 > cutoff_fraction:
                output_read_1.write(line_r1_header)
                output_read_1.write(line_r1_sequence)
                output_read_2.write(line_r2_header)
                output_read_2.write(line_r2_sequence)
            else:
                filtered += 1
        else:
            break
    print "LZW filter: total reads: %d, filtered reads: %d, kept ratio: %f" % (count, filtered, 1 - float(filtered)/count)
    output_read_1.close()
    output_read_2.close()

def generate_unmapped_pairs_from_sam(sam_file, output_prefix):
    output_read_1 = open(output_prefix + '.1.fasta', 'wb')
    output_read_2 = open(output_prefix + '.2.fasta', 'wb')
    output_merged_read = open(output_prefix + '.merged.fasta', 'wb')
    header = True
    with open(sam_file, 'rb') as samf:
        line = samf.readline()
        while(line[0] == '@'):
            line = samf.readline() # skip headers
        read1 = line
        read2 = samf.readline()
        while (len(read1) > 0 and len(read2) >0):
            parts1 = read1.split("\t")
            parts2 = read2.split("\t")
            if (parts1[1] == "77" and parts2[1] == "141"): # both parts unmapped
                output_read_1.write(">%s\n%s\n" %(parts1[0], parts1[9]))
                output_read_2.write(">%s\n%s\n" %(parts2[0], parts2[9]))
                output_merged_read.write(">%s/1\n%s\n" %(parts1[0], parts1[9]))
                output_merged_read.write(">%s/2\n%s\n" %(parts2[0], parts2[9]))
            else: # parts mapped
                print "Matched HG38 -----"
                print read1
                print read2
            read1 = samf.readline()
            read2 = samf.readline()
    output_read_1.close()
    output_read_2.close()
    output_merged_read.close()

def generate_tax_counts_from_m8(m8_file, output_file):
    # uses m8 file with read names beginning as: "taxid<taxon ID>:"
    taxid_count_map = {}
    with open(m8_file, 'rb') as m8f:
        for line in m8f:
            taxid = (line.split("taxid"))[1].split(":")[0]
            taxid_count_map[taxid] = taxid_count_map.get(taxid, 0) + 1
    with open(output_file, 'w') as f:
        writer = csv.writer(f)
        for row in taxid_count_map.items():
            writer.writerow(row)

def generate_rpm_from_taxid_counts(rawReadsInputPath, taxidCountsInputPath, taxid2infoPath, speciesOutputPath, genusOutputPath):
    total_reads = subprocess.check_output("zcat %s | wc -l" % rawReadsInputPath, shell=True)
    total_reads = int(2*total_reads.rstrip())/4
    taxid2info_map = shelve.open(taxid2infoPath)
    species_rpm_map = {}
    genus_rpm_map = {}
    species_name_map = {}
    genus_name_map = {}
    with open(taxidCountsInputPath) as f:
        for line in f:
            tok = line.rstrip().split(",")
            taxid = tok[0]
            count = float(tok[1])
            species_taxid, genus_taxid, scientific_name = taxid2info_map.get(taxid, ("NA", "NA", "NA"))
            species_rpm_map[species_taxid] = float(species_rpm_map.get(species_taxid, 0)) + count/total_reads*1000000.0
            genus_rpm_map[genus_taxid] = float(genus_rpm_map.get(genus_taxid, 0)) + count/total_reads*1000000.0
            species_name_map[species_taxid] = scientific_name
            genus_name_map[genus_taxid] = scientific_name.split()[0]
    species_outf = open(speciesOutputPath, 'w')
    species_taxids = species_rpm_map.keys()
    for species_taxid in sorted(species_taxids, key=lambda species_taxid: species_rpm_map.get(species_taxid), reverse=True):
        species_name = species_name_map.get(species_taxid, "NA")
        rpm = species_rpm_map.get(species_taxid)
        species_outf.write("%s,%s,%s\n" % (species_taxid, species_name, rpm))
    species_outf.close()
    genus_outf = open(genusOutputPath, 'w')
    genus_taxids = genus_rpm_map.keys()
    for genus_taxid in sorted(genus_taxids, key=lambda genus_taxid: genus_rpm_map.get(genus_taxid), reverse=True):
        genus_name = genus_name_map.get(genus_taxid, "NA")
        rpm = genus_rpm_map.get(genus_taxid)
        genus_outf.write("%s,%s,%s\n" % (genus_taxid, genus_name, rpm))
    genus_outf.close()

def generate_json_from_taxid_counts(sample, rawReadsInputPath, taxidCountsInputPath,
                                    taxid2infoPath, jsonOutputPath, countType, dbSampleId,
                                    sampleHost, sampleLocation, sampleDate, sampleTissue,
                                    sampleTemplate, sampleLibrary, sampleSequencer, sampleNotes):
    # produce json in Ryan's output format (https://github.com/chanzuckerberg/idseq-web/blob/master/test/output.json)
    taxid2info_map = shelve.open(taxid2infoPath)
    total_reads = subprocess.check_output("zcat %s | wc -l" % rawReadsInputPath, shell=True)
    total_reads = 2*int(total_reads.rstrip())/4
    taxon_counts_attributes = []
    remaining_reads = 0

    genus_to_count = {}
    genus_to_name = {}
    species_to_count = {}
    species_to_name = {}
    with open(taxidCountsInputPath) as f:
        for line in f:
            tok = line.rstrip().split(",")
            taxid = tok[0]
            count = float(tok[1])
            species_taxid, genus_taxid, scientific_name = taxid2info_map.get(taxid, ("-1", "-2", "NA"))
            remaining_reads = remaining_reads + count
            genus_to_count[genus_taxid] = genus_to_count.get(genus_taxid, 0) + count
            genus_to_name[genus_taxid]  = scientific_name.split(" ")[0]
            species_to_count[species_taxid] = species_to_count.get(species_taxid, 0) + count
            species_to_name[species_taxid] = scientific_name

    for (taxid, count) in species_to_count.iteritems():
        species_name = species_to_name[taxid]
        taxon_counts_attributes.append({"tax_id": taxid,
                                        "tax_level": TAX_LEVEL_SPECIES,
                                        "count": count,
                                        "name": species_name,
                                        "count_type": countType})

    for (taxid, count) in genus_to_count.iteritems():
        genus_name = genus_to_name[taxid]
        taxon_counts_attributes.append({"tax_id": taxid,
                                        "tax_level": TAX_LEVEL_GENUS,
                                        "count": count,
                                        "name": genus_name,
                                        "count_type": countType})

    output_dict = {
        "pipeline_output": {
            "total_reads": total_reads,
            "remaining_reads": remaining_reads,
            "sample_id": dbSampleId,
            "sampleHost": sampleHost,
            "sampleLocation": sampleLocation,
            "sampleDate": sampleDate,
            "sampleTissue": sampleTissue,
            "sampleTemplate": sampleTemplate,
            "sampleLibrary": sampleLibrary,
            "sampleSequencer": sampleSequencer,
            "sampleNotes": sampleNotes,
            "taxon_counts_attributes": taxon_counts_attributes
      }
    }
    with open(jsonOutputPath, 'wb') as outf:
        json.dump(output_dict, outf)

def combine_json(inputPath1, inputPath2, outputPath):
    with open(inputPath1) as inf1:
        input1 = json.load(inf1).get("pipeline_output")
    with open(inputPath2) as inf2:
        input2 = json.load(inf2).get("pipeline_output")
    total_reads = max(input1.get("total_reads"),
                      input2.get("total_reads"))
    remaining_reads = max(input1.get("remaining_reads"),
                      input2.get("remaining_reads")) 
    taxon_counts_attributes = (input1.get("taxon_counts_attributes")
                              + input2.get("taxon_counts_attributes"))
    pipeline_output_dict = {
        "total_reads": total_reads,
        "remaining_reads": remaining_reads,
        "taxon_counts_attributes": taxon_counts_attributes
    }
    rest_entries = {field: input1[field] for field in input1.keys() if field not in ["total_reads", "remaining_reads", "taxon_counts_attributes"]}
    pipeline_output_dict.update(rest_entries)
    output_dict = {
        "pipeline_output": pipeline_output_dict
    }                          
    with open(outputPath, 'wb') as outf:
        json.dump(output_dict, outf)

def generate_taxid_annotated_m8(input_m8, output_m8, accession2taxid_db):
    accession2taxid_dict = shelve.open(accession2taxid_db)
    outf = open(output_m8, "wb")
    with open(input_m8, "rb") as m8f:
        for line in m8f:
            if line[0] == '#':
                continue
            parts = line.split("\t")
            read_name = parts[0] # Example: HWI-ST640:828:H917FADXX:2:1108:8883:88679/1/1',
            accession_id = parts[1] # Example: CP000671.1',
            accession_id_short = accession_id.split(".")[0]
            new_line = "taxid" + accession2taxid_dict.get(accession_id_short, "NA") + ":" + line
            outf.write(new_line)
    outf.close()

### job functions

def execute_command(command):
    print command
    output = subprocess.check_output(command, shell=True)
    return output

def wait_for_server(service_name, command, max_concurrent):
    while True:
        output = execute_command(command).rstrip().split("\n")
        if len(output) <= max_concurrent:
            print "%s server has capacity. Kicking off " % service_name
            return
        else:
            wait_seconds = random.randint(30, 60)
            print "%s server busy. %d processes running. Wait for %d seconds" % \
                  (service_name, len(output), wait_seconds)
            time.sleep(wait_seconds)

class TimeFilter(logging.Filter):
    def filter(self, record):
        try:
          last = self.last
        except AttributeError:
          last = record.relativeCreated
        delta = datetime.datetime.fromtimestamp(record.relativeCreated/1000.0) - datetime.datetime.fromtimestamp(last/1000.0)
        record.time_since_last = '{0:.2f}'.format(delta.seconds + delta.microseconds/1000000.0)
        self.last = record.relativeCreated
        return True

def run_sample(sample_s3_input_path, sample_s3_output_path,
               star_genome_s3_path, bowtie2_genome_s3_path,
               gsnap_ssh_key_s3_path, rapsearch_ssh_key_s3_path, accession2taxid_s3_path,
               deuterostome_list_s3_path, taxid2info_s3_path, db_sample_id, 
               sample_host, sample_location, sample_date, sample_tissue,
               sample_template, sample_library, sample_sequencer, sample_notes,
               lazy_run = True):

    sample_s3_output_path = sample_s3_output_path.rstrip('/')
    sample_name = os.path.basename(sample_s3_input_path.rstrip('/'))
    sample_dir = DEST_DIR + '/' + sample_name
    fastq_dir = sample_dir + '/fastqs'
    result_dir = sample_dir + '/results'
    scratch_dir = sample_dir + '/scratch'
    execute_command("mkdir -p %s %s %s %s" % (sample_dir, fastq_dir, result_dir, scratch_dir))
    execute_command("mkdir -p %s " % REF_DIR);
    
    # configure logger
    logger = logging.getLogger()
    logger.setLevel(logging.INFO)
    handler = logging.FileHandler(result_dir+'/'+LOGS_OUT, 'w')
    formatter = logging.Formatter("%(asctime)s (%(time_since_last)ss elapsed): %(message)s")
    handler.addFilter(TimeFilter())
    handler.setFormatter(formatter)
    logger.addHandler(handler)

    # Download fastqs
    command = "aws s3 ls %s/ |grep fastq.gz" % (sample_s3_input_path)
    output = execute_command(command).rstrip().split("\n")
    for line in output:
        m = re.match(".*?([^ ]*.fastq.gz)", line)
        if m:
            execute_command("aws s3 cp %s/%s %s/" % (sample_s3_input_path, m.group(1), fastq_dir))
        else:
            print "%s doesn't match fastq.gz" % line

    fastq_files = execute_command("ls %s/*.fastq.gz" % fastq_dir).rstrip().split("\n")

    if len(fastq_files) <= 1:
        return # only support paired reads for now
    else:
        fastq_file_1 = fastq_files[0]
        fastq_file_2 = fastq_files[1]

    if lazy_run:
       # Download existing data and see what has been done
        command = "aws s3 cp %s %s --recursive" % (sample_s3_output_path, result_dir)
        print execute_command(command)
    
    # run STAR
    run_star(sample_name, fastq_file_1, fastq_file_2, star_genome_s3_path,
             result_dir, scratch_dir, sample_s3_output_path, lazy_run)
 
    # run priceseqfilter
    run_priceseqfilter(sample_name, result_dir +'/' + STAR_OUT1, result_dir +'/' + STAR_OUT2,
                       result_dir, sample_s3_output_path, lazy_run)
 
    # run fastq to fasta
    run_fq2fa(sample_name, result_dir +'/' + PRICESEQFILTER_OUT1,
              result_dir +'/' + PRICESEQFILTER_OUT2,
              result_dir, sample_s3_output_path, lazy_run)
    
    # run cdhitdup
    run_cdhitdup(sample_name, result_dir +'/' + FQ2FA_OUT1, result_dir +'/' + FQ2FA_OUT2,
                 result_dir, sample_s3_output_path, lazy_run)
    records_remaining = sum(1 for line in open(result_dir +'/' + CDHITDUP_OUT1) if line.startswith(('>')))

    # run lzw filter
    run_lzw(sample_name, result_dir +'/' + CDHITDUP_OUT1, result_dir +'/' + CDHITDUP_OUT2,
            result_dir, sample_s3_output_path, lazy_run)
    
    # run bowtie
    run_bowtie2(sample_name, result_dir +'/' + LZW_OUT1, result_dir +'/' + LZW_OUT2,
                bowtie2_genome_s3_path, result_dir, sample_s3_output_path, lazy_run)
    
    # run gsnap remotely
    run_gsnapl_remotely(sample_name, EXTRACT_UNMAPPED_FROM_SAM_OUT1, EXTRACT_UNMAPPED_FROM_SAM_OUT2,
                        gsnap_ssh_key_s3_path,
                        result_dir, sample_s3_output_path, lazy_run)
 
    # run_annotate_gsnapl_m8_with_taxids
    run_annotate_m8_with_taxids(sample_name,
                                result_dir + '/' + GSNAPL_OUT,
                                result_dir + '/' + ANNOTATE_GSNAPL_M8_WITH_TAXIDS_OUT,
                                accession2taxid_s3_path,
                                result_dir, sample_s3_output_path, lazy_run=False)
 
    # run_generate_taxid_annotated_fasta_from_m8
    run_generate_taxid_annotated_fasta_from_m8(sample_name,
        result_dir + '/' + GSNAPL_OUT,
        result_dir + '/' + EXTRACT_UNMAPPED_FROM_SAM_OUT3,
        result_dir + '/' + FILTER_DEUTEROSTOME_FROM_TAXID_ANNOTATED_FASTA_OUT,
        'NT',
        result_dir, sample_s3_output_path, lazy_run=False)
 
    run_generate_taxid_outputs_from_m8(sample_name,
        result_dir + '/' + ANNOTATE_GSNAPL_M8_WITH_TAXIDS_OUT,
        fastq_file_1,
        result_dir + '/' + NT_M8_TO_TAXID_COUNTS_FILE_OUT,
        result_dir + '/' + NT_TAXID_COUNTS_TO_JSON_OUT,
        result_dir + '/' + NT_TAXID_COUNTS_TO_SPECIES_RPM_OUT,
        result_dir + '/' + NT_TAXID_COUNTS_TO_GENUS_RPM_OUT,
        taxid2info_s3_path, 'NT', db_sample_id,
        sample_host, sample_location, sample_date, sample_tissue,
        sample_template, sample_library, sample_sequencer, sample_notes,
        result_dir, sample_s3_output_path, lazy_run=False)
 
    # run rapsearch remotely
    run_rapsearch2_remotely(sample_name, FILTER_DEUTEROSTOME_FROM_TAXID_ANNOTATED_FASTA_OUT,
                           rapsearch_ssh_key_s3_path,
                           result_dir, sample_s3_output_path, lazy_run)
 
    # run_annotate_m8_with_taxids
    run_annotate_m8_with_taxids(sample_name,
                                result_dir + '/' + RAPSEARCH2_OUT,
                                result_dir + '/' + ANNOTATE_RAPSEARCH2_M8_WITH_TAXIDS_OUT,
                                accession2taxid_s3_path,
                                result_dir, sample_s3_output_path, lazy_run=False)
 
    # run_generate_taxid_annotated_fasta_from_m8
    run_generate_taxid_annotated_fasta_from_m8(sample_name,
        result_dir + '/' + RAPSEARCH2_OUT,
        result_dir + '/' + FILTER_DEUTEROSTOME_FROM_TAXID_ANNOTATED_FASTA_OUT,
        result_dir + '/' + GENERATE_TAXID_ANNOTATED_FASTA_FROM_RAPSEARCH2_M8_OUT,
        'NR',
        result_dir, sample_s3_output_path, lazy_run=False)
 
    run_generate_taxid_outputs_from_m8(sample_name,
        result_dir + '/' + ANNOTATE_RAPSEARCH2_M8_WITH_TAXIDS_OUT,
        fastq_file_1,
        result_dir + '/' + NR_M8_TO_TAXID_COUNTS_FILE_OUT,
        result_dir + '/' + NR_TAXID_COUNTS_TO_JSON_OUT,
        result_dir + '/' + NR_TAXID_COUNTS_TO_SPECIES_RPM_OUT,
        result_dir + '/' + NR_TAXID_COUNTS_TO_GENUS_RPM_OUT,
        taxid2info_s3_path, 'NR', db_sample_id, 
        sample_host, sample_location, sample_date, sample_tissue,
        sample_template, sample_library, sample_sequencer, sample_notes,
        result_dir, sample_s3_output_path, lazy_run=False)

    run_combine_json_outputs(sample_name,
        result_dir + '/' + NT_TAXID_COUNTS_TO_JSON_OUT,
        result_dir + '/' + NR_TAXID_COUNTS_TO_JSON_OUT,
        result_dir + '/' + COMBINED_JSON_OUT,
        result_dir, sample_s3_output_path, lazy_run=False)

def run_star(sample_name, fastq_file_1, fastq_file_2, star_genome_s3_path,
             result_dir, scratch_dir, sample_s3_output_path, lazy_run):
    logger = logging.getLogger()
    logger.info("========== STAR ==========")
    if lazy_run and os.path.isfile(os.path.join(result_dir, STAR_OUT1)) and os.path.isfile(os.path.join(result_dir, STAR_OUT2)):
        logger.info("output exists, lazy run")
    else:   
        # check if genome downloaded already
        genome_file = os.path.basename(star_genome_s3_path)
        if not os.path.isfile("%s/%s" % (REF_DIR, genome_file)):
            execute_command("aws s3 cp %s %s/" % (star_genome_s3_path, REF_DIR))
            execute_command("cd %s; tar xvfz %s" % (REF_DIR, genome_file))
            logger.info("downloaded index")
        star_command_params = ['cd', scratch_dir, ';', STAR,
                        '--outFilterMultimapNmax', '99999',
                        '--outFilterScoreMinOverLread', '0.5',
                        '--outFilterMatchNminOverLread', '0.5',
                        '--outReadsUnmapped', 'Fastx',
                        '--outFilterMismatchNmax', '999',
                        '--outSAMmode', 'None',
                        '--quantMode', 'GeneCounts',
                        '--clip3pNbases', '0',
                        '--readFilesCommand', 'zcat',
                        '--runThreadN', str(multiprocessing.cpu_count()),
                        '--genomeDir', REF_DIR + '/STAR_genome',
                        '--readFilesIn', fastq_file_1, fastq_file_2]
        logger.info(execute_command(" ".join(star_command_params)))
        logger.info("finished")
        # extract out unmapped files
        execute_command("cp %s/%s %s/%s;" % (scratch_dir, 'Unmapped.out.mate1', result_dir, STAR_OUT1))
        execute_command("cp %s/%s %s/%s;" % (scratch_dir, 'Unmapped.out.mate2', result_dir, STAR_OUT2))
        # copy back to aws
        execute_command("aws s3 cp %s/%s %s/;" % (result_dir, STAR_OUT1, sample_s3_output_path))
        execute_command("aws s3 cp %s/%s %s/;" % (result_dir, STAR_OUT2, sample_s3_output_path))
        logger.info("uploaded output")
    # count records
    records_before = sum(1 for line in gzip.open(fastq_file_1))/4
    records_after = sum(1 for line in open(result_dir +'/' + STAR_OUT1))/4
    percent_removed = (100.0 * (records_before - records_after)) / records_before
    logger.info("%s %% of records dropped out, %s records remaining" % (str(percent_removed), str(records_after)))
    execute_command("aws s3 cp %s/%s %s/;" % (result_dir, LOGS_OUT, sample_s3_output_path))
    # cleanup
    execute_command("cd %s; rm -rf *" % scratch_dir)

def run_priceseqfilter(sample_name, input_fq_1, input_fq_2,
                       result_dir, sample_s3_output_path, lazy_run):
    logger = logging.getLogger()
    logger.info("========== PriceSeqFilter ==========")
    if lazy_run and os.path.isfile(os.path.join(result_dir, PRICESEQFILTER_OUT1)) and os.path.isfile(os.path.join(result_dir, PRICESEQFILTER_OUT2)):
        logging.info("output exists, lazy run")
    else:
        priceseq_params = [PRICESEQ_FILTER,
                           '-a','12',
                           '-fp',input_fq_1 , input_fq_2,
                           '-op',
                           result_dir +'/' + PRICESEQFILTER_OUT1,
                           result_dir +'/' + PRICESEQFILTER_OUT2,
                           '-rqf','85','0.98',
                           '-rnf','90',
                           '-log','c']
        logger.info(execute_command(" ".join(priceseq_params)))
        logger.info("finished")
        # copy back to aws
        execute_command("aws s3 cp %s/%s %s/;" % (result_dir, PRICESEQFILTER_OUT1, sample_s3_output_path))
        execute_command("aws s3 cp %s/%s %s/;" % (result_dir, PRICESEQFILTER_OUT2, sample_s3_output_path))
        logger.info("uploaded output")
    # count records
    records_before = sum(1 for line in open(input_fq_1))/4
    records_after = sum(1 for line in open(result_dir +'/' + PRICESEQFILTER_OUT1))/4
    percent_removed = (100.0 * (records_before - records_after)) / records_before
    logger.info("%s %% of records dropped out, %s records remaining" % (str(percent_removed), str(records_after)))
    execute_command("aws s3 cp %s/%s %s/;" % (result_dir, LOGS_OUT, sample_s3_output_path))

def run_fq2fa(sample_name, input_fq_1, input_fq_2,
              result_dir, sample_s3_output_path, lazy_run):
    logger = logging.getLogger()
    logger.info("========== FASTQ to FASTA ==========")
    if lazy_run and os.path.isfile(os.path.join(result_dir, FQ2FA_OUT1)) and os.path.isfile(os.path.join(result_dir, FQ2FA_OUT2)):
        logging.info("output exists, lazy run")
    else:
        execute_command("sed -n '1~4s/^@/>/p;2~4p' <%s >%s/%s" % (input_fq_1, result_dir, FQ2FA_OUT1))
        execute_command("sed -n '1~4s/^@/>/p;2~4p' <%s >%s/%s" % (input_fq_2, result_dir, FQ2FA_OUT2))
        logger.info("finished")
        # copy back to aws
        execute_command("aws s3 cp %s/%s %s/;" % (result_dir, FQ2FA_OUT1, sample_s3_output_path))
        execute_command("aws s3 cp %s/%s %s/;" % (result_dir, FQ2FA_OUT2, sample_s3_output_path))
        logger.info("uploaded output")
    execute_command("aws s3 cp %s/%s %s/;" % (result_dir, LOGS_OUT, sample_s3_output_path))

def run_cdhitdup(sample_name, input_fa_1, input_fa_2,
                 result_dir, sample_s3_output_path, lazy_run):
    logger = logging.getLogger()
    logger.info("========== CD-HIT-DUP ==========")
    if lazy_run and os.path.isfile(os.path.join(result_dir, CDHITDUP_OUT1)) and os.path.isfile(os.path.join(result_dir, CDHITDUP_OUT2)):
        logging.info("output exists, lazy run")
    else:
        cdhitdup_params = [CDHITDUP,
                           '-i',  input_fa_1,
                           '-i2', input_fa_2,
                           '-o',  result_dir + '/' + CDHITDUP_OUT1,
                           '-o2', result_dir + '/' + CDHITDUP_OUT2,
                           '-e',  '0.05', '-u', '70']
        logger.info(execute_command(" ".join(cdhitdup_params)))
        logger.info("finished")
        # copy back to aws
        execute_command("aws s3 cp %s/%s %s/;" % (result_dir, CDHITDUP_OUT1, sample_s3_output_path))
        execute_command("aws s3 cp %s/%s %s/;" % (result_dir, CDHITDUP_OUT2, sample_s3_output_path))
        logger.info("uploaded output")
    # count records
    records_before = sum(1 for line in open(input_fa_1) if line.startswith(('>')))
    records_after = sum(1 for line in open(result_dir +'/' + CDHITDUP_OUT1) if line.startswith(('>')))
    percent_removed = (100.0 * (records_before - records_after)) / records_before
    logger.info("%s %% of records dropped out, %s records remaining" % (str(percent_removed), str(records_after)))
    execute_command("aws s3 cp %s/%s %s/;" % (result_dir, LOGS_OUT, sample_s3_output_path))

def run_lzw(sample_name, input_fa_1, input_fa_2,
            result_dir, sample_s3_output_path, lazy_run):
    logger = logging.getLogger()
    logger.info("========== LZW filter ==========")
    if lazy_run and os.path.isfile(os.path.join(result_dir, LZW_OUT1)) and os.path.isfile(os.path.join(result_dir, LZW_OUT2)):
        logger.info("output exists, lazy run")
    else:    
        output_prefix = result_dir + '/' + LZW_OUT1[:-8]
        generate_lzw_filtered_paired(input_fa_1, input_fa_2, output_prefix, LZW_FRACTION_CUTOFF)
        logger.info("finished")
        # copy back to aws
        execute_command("aws s3 cp %s/%s %s/;" % (result_dir, LZW_OUT1, sample_s3_output_path))
        execute_command("aws s3 cp %s/%s %s/;" % (result_dir, LZW_OUT2, sample_s3_output_path))
        logger.info("uploaded output")
    # count records
    records_before = sum(1 for line in open(input_fa_1) if line.startswith(('>')))
    records_after = sum(1 for line in open(result_dir +'/' + LZW_OUT1) if line.startswith(('>')))
    percent_removed = (100.0 * (records_before - records_after)) / records_before
    logger.info("%s %% of records dropped out, %s records remaining" % (str(percent_removed), str(records_after)))
    execute_command("aws s3 cp %s/%s %s/;" % (result_dir, LOGS_OUT, sample_s3_output_path))

def run_bowtie2(sample_name, input_fa_1, input_fa_2, bowtie_genome_s3_path,
                result_dir, sample_s3_output_path, lazy_run):
    logger = logging.getLogger()
    logger.info("========== bowtie2 ==========")
    output1 = "%s/%s" % (result_dir, BOWTIE2_OUT)
    output2 = "%s/%s" % (result_dir, EXTRACT_UNMAPPED_FROM_SAM_OUT1)
    output3 = "%s/%s" % (result_dir, EXTRACT_UNMAPPED_FROM_SAM_OUT2)
    output4 = "%s/%s" % (result_dir, EXTRACT_UNMAPPED_FROM_SAM_OUT3)
    if lazy_run and os.path.isfile(output1) and os.path.isfile(output2) and \
                    os.path.isfile(output3) and os.path.isfile(output4):
        logger.info("output exists, lazy run")
    else:
        # Doing the work
        # check if genome downloaded already
        genome_file = os.path.basename(bowtie_genome_s3_path)
        if not os.path.isfile("%s/%s" % (REF_DIR, genome_file)):
            execute_command("aws s3 cp %s %s/" % (bowtie_genome_s3_path, REF_DIR))
            execute_command("cd %s; tar xvfz %s" % (REF_DIR, genome_file))
            logger.info("downloaded index")
        genome_basename = REF_DIR + '/bowtie2_genome/GRCh38.primary_assembly.genome'
        bowtie2_params = [BOWTIE2,
                         '-p', str(multiprocessing.cpu_count()),
                         '-x', genome_basename,
                         '--very-sensitive-local',
                         '-f', '-1', input_fa_1, '-2', input_fa_2,
                         '-S', result_dir + '/' + BOWTIE2_OUT]
        logger.info(execute_command(" ".join(bowtie2_params)))
        logger.info("finished")
        # extract out unmapped files from sam
        output_prefix = result_dir + '/' + EXTRACT_UNMAPPED_FROM_SAM_OUT1[:-8]
        generate_unmapped_pairs_from_sam(result_dir + '/' + BOWTIE2_OUT, output_prefix)
        logger.info("extracted unmapped pairs from SAM file")
        # copy back to aws
        execute_command("aws s3 cp %s/%s %s/;" % (result_dir, BOWTIE2_OUT, sample_s3_output_path))
        execute_command("aws s3 cp %s/%s %s/;" % (result_dir, EXTRACT_UNMAPPED_FROM_SAM_OUT1, sample_s3_output_path))
        execute_command("aws s3 cp %s/%s %s/;" % (result_dir, EXTRACT_UNMAPPED_FROM_SAM_OUT2, sample_s3_output_path))
        execute_command("aws s3 cp %s/%s %s/;" % (result_dir, EXTRACT_UNMAPPED_FROM_SAM_OUT3, sample_s3_output_path))
        logger.info("uploaded output")
    # count records
    records_before = sum(1 for line in open(input_fa_1) if line.startswith(('>')))
    records_after = sum(1 for line in open(result_dir +'/' + EXTRACT_UNMAPPED_FROM_SAM_OUT1) if line.startswith(('>')))
    percent_removed = (100.0 * (records_before - records_after)) / records_before
    logger.info("%s %% of records dropped out, %s records remaining" % (str(percent_removed), str(records_after)))
    execute_command("aws s3 cp %s/%s %s/;" % (result_dir, LOGS_OUT, sample_s3_output_path))

def run_gsnapl_remotely(sample, input_fa_1, input_fa_2,
                        gsnap_ssh_key_s3_path,
                        result_dir, sample_s3_output_path, lazy_run):
    logger = logging.getLogger()
    logger.info("========== GSNAPL ==========")
    if lazy_run and os.path.isfile(os.path.join(result_dir, GSNAPL_OUT)):
        logger.info("output exists, lazy run")
    else:
        key_name = os.path.basename(gsnap_ssh_key_s3_path)
        execute_command("aws s3 cp %s %s/" % (gsnap_ssh_key_s3_path, REF_DIR))
        key_path = REF_DIR +'/' + key_name
        execute_command("chmod 400 %s" % key_path)
        commands =  "mkdir -p /home/ec2-user/batch-pipeline-workdir/%s;" % sample
        commands += "aws s3 cp %s/%s /home/ec2-user/batch-pipeline-workdir/%s/ ; " % \
                     (sample_s3_output_path, input_fa_1, sample)
        commands += "aws s3 cp %s/%s /home/ec2-user/batch-pipeline-workdir/%s/ ; " % \
                     (sample_s3_output_path, input_fa_2, sample)
        commands += " ".join(['/home/ec2-user/bin/gsnapl',
                              '-A', 'm8', '--batch=2',
                              '--gmap-mode=none', '--npaths=1', '--ordered',
                              '-t', '32',
                              '--maxsearch=5', '--max-mismatches=20',
                              '-D', '/home/ec2-user/share', '-d', 'nt_k16',
                              '/home/ec2-user/batch-pipeline-workdir/'+sample+'/'+input_fa_1,
                              '/home/ec2-user/batch-pipeline-workdir/'+sample+'/'+input_fa_2,
                              '> /home/ec2-user/batch-pipeline-workdir/'+sample+'/'+GSNAPL_OUT, ';'])
        commands += "aws s3 cp /home/ec2-user/batch-pipeline-workdir/%s/%s %s/;" % \
                     (sample, GSNAPL_OUT, sample_s3_output_path)
        # check if remote machins has enough capacity 
        check_command = 'ssh -o "StrictHostKeyChecking no" -i %s ec2-user@%s "ps aux|grep gsnapl|grep -v bash"' % (key_path, GSNAPL_INSTANCE_IP)
        wait_for_server('GSNAPL', check_command, GSNAPL_MAX_CONCURRENT)

        remote_command = 'ssh -o "StrictHostKeyChecking no" -i %s ec2-user@%s "%s"' % (key_path, GSNAPL_INSTANCE_IP, commands)
        execute_command(remote_command)
        # move gsnapl output back to local
        time.sleep(10)
        logger.info("finished")
        execute_command("aws s3 cp %s/%s %s/" % (sample_s3_output_path, GSNAPL_OUT, result_dir))
        logger.info("copied output back")
    # count records
    records_before = sum(1 for line in open(result_dir +'/' + input_fa_1) if line.startswith(('>')))
    records_after = sum(1 for line in open(result_dir +'/' + GSNAPL_OUT))
    percent_removed = (100.0 * (records_before - records_after)) / records_before
    logger.info("%s %% of records dropped out, %s records remaining" % (str(percent_removed), str(records_after)))
    execute_command("aws s3 cp %s/%s %s/;" % (result_dir, LOGS_OUT, sample_s3_output_path))

def run_annotate_m8_with_taxids(sample_name, input_m8, output_m8,
                                accession2taxid_s3_path,
                                result_dir, sample_s3_output_path, lazy_run):
    logger = logging.getLogger()
    logger.info("========== annotate m8 with taxids ==========")
    if lazy_run and os.path.isfile(output_m8):
        logger.info("output exists, lazy run")
    else:
        accession2taxid_gz = os.path.basename(accession2taxid_s3_path)
        accession2taxid_path = REF_DIR + '/' + accession2taxid_gz[:-3]
        if not os.path.isfile(accession2taxid_path):
            execute_command("aws s3 cp %s %s/" % (accession2taxid_s3_path, REF_DIR))
            execute_command("cd %s; gunzip %s" % (REF_DIR, accession2taxid_gz))
            logger.info("accession-to-taxid map downloaded")
        generate_taxid_annotated_m8(input_m8, output_m8, accession2taxid_path)
        logger.info("finished")
        # move the output back to S3
        execute_command("aws s3 cp %s %s/" % (output_m8, sample_s3_output_path))
        logger.info("uploaded output")
    execute_command("aws s3 cp %s/%s %s/;" % (result_dir, LOGS_OUT, sample_s3_output_path))

def run_generate_taxid_annotated_fasta_from_m8(sample_name, input_m8, input_fasta,
    output_fasta, annotation_prefix, result_dir, sample_s3_output_path, lazy_run):
    logger = logging.getLogger()
    logger.info("========== generate taxid annotated fasta from m8 ==========")
    if lazy_run and os.path.isfile(output_fasta):
        logger.info("output exists, lazy run")
    else:
        generate_taxid_annotated_fasta_from_m8(input_fasta, input_m8, output_fasta, annotation_prefix)
        logger.info("finished")
        # move the output back to S3
        execute_command("aws s3 cp %s %s/" % (output_fasta, sample_s3_output_path))
        logger.info("uploaded output")
    execute_command("aws s3 cp %s/%s %s/;" % (result_dir, LOGS_OUT, sample_s3_output_path))

def run_rapsearch2_remotely(sample, input_fasta,
    rapsearch_ssh_key_s3_path, result_dir, sample_s3_output_path, lazy_run):
    logger = logging.getLogger()
    logger.info("========== RAPSearch2 ==========")
    if lazy_run and os.path.isfile(os.path.join(result_dir, RAPSEARCH2_OUT)):
        logger.info("output exists, lazy run")
    else:
        key_name = os.path.basename(rapsearch_ssh_key_s3_path)
        execute_command("aws s3 cp %s %s/" % (rapsearch_ssh_key_s3_path, REF_DIR))
        key_path = REF_DIR +'/' + key_name
        execute_command("chmod 400 %s" % key_path)
        commands =  "mkdir -p /home/ec2-user/batch-pipeline-workdir/%s;" % sample
        commands += "aws s3 cp %s/%s /home/ec2-user/batch-pipeline-workdir/%s/ ; " % \
                     (sample_s3_output_path, input_fasta, sample)
        input_path = '/home/ec2-user/batch-pipeline-workdir/' + sample + '/' + input_fasta
        output_path = '/home/ec2-user/batch-pipeline-workdir/' + sample + '/' + RAPSEARCH2_OUT
        commands += " ".join(['/home/ec2-user/bin/rapsearch',
                              '-d', '/home/ec2-user/references/nr_rapsearch/nr_rapsearch',
                              '-e','-6',
                              '-l','10',
                              '-a','T',
                              '-b','0',
                              '-v','1',
                              '-z', str(multiprocessing.cpu_count()), # threads
                              '-q', input_path,
                              '-o', output_path[:-3],
                              ';'])
        commands += "aws s3 cp /home/ec2-user/batch-pipeline-workdir/%s/%s %s/;" % \
                     (sample, RAPSEARCH2_OUT, sample_s3_output_path)
        check_command = 'ssh -o "StrictHostKeyChecking no" -i %s ec2-user@%s "ps aux|grep rapsearch|grep -v bash"' % (key_path, RAPSEARCH2_INSTANCE_IP)
        wait_for_server('RAPSEARCH2', check_command, RAPSEARCH2_MAX_CONCURRENT)
        remote_command = 'ssh -o "StrictHostKeyChecking no" -i %s ec2-user@%s "%s"' % (key_path, RAPSEARCH2_INSTANCE_IP, commands)
        execute_command(remote_command)
        logger.info("finished")
        # move output back to local
        time.sleep(10) # wait until the data is synced
        execute_command("aws s3 cp %s/%s %s/" % (sample_s3_output_path, RAPSEARCH2_OUT, result_dir))
        logger.info("copied output back")
    # count records
    records_before = sum(1 for line in open(result_dir +'/' + input_fasta) if line.startswith(('>')))
    records_after = sum(1 for line in open(result_dir +'/' + RAPSEARCH2_OUT))
    percent_removed = (100.0 * (records_before - records_after)) / records_before
    logger.info("%s %% of records dropped out, %s records remaining" % (str(percent_removed), str(records_after)))
    execute_command("aws s3 cp %s/%s %s/;" % (result_dir, LOGS_OUT, sample_s3_output_path))

def run_generate_taxid_outputs_from_m8(sample_name,
    annotated_m8, fastq_file_1,
    taxon_counts_csv_file, taxon_counts_json_file,
    taxon_species_rpm_file, taxon_genus_rpm_file,
    taxinfodb_s3_path, count_type, db_sample_id,
    sample_host, sample_location, sample_date, sample_tissue,
    sample_template, sample_library, sample_sequencer, sample_notes,
    result_dir, sample_s3_output_path, lazy_run):
    logger = logging.getLogger()
    logger.info("========== generate taxid outputs from m8 ==========")
    # Ignore lazyrun
    # download taxoninfodb if not exist
    taxoninfo_filename = os.path.basename(taxinfodb_s3_path)
    taxoninfo_path = REF_DIR + '/' + taxoninfo_filename
    if not os.path.isfile(taxoninfo_path):
        execute_command("aws s3 cp %s %s/" % (taxinfodb_s3_path, REF_DIR))
        logger.info("downloaded taxon info database")
    generate_tax_counts_from_m8(annotated_m8, taxon_counts_csv_file)
    logger.info("generated taxon counts from m8")
    generate_json_from_taxid_counts(sample_name, fastq_file_1, taxon_counts_csv_file,
                                    taxoninfo_path, taxon_counts_json_file,
                                    count_type, db_sample_id, sample_host, sample_location,
                                    sample_date, sample_tissue, sample_template, sample_library,
                                    sample_sequencer, sample_notes)
    logger.info("generated JSON file from taxon counts")
    generate_rpm_from_taxid_counts(fastq_file_1, taxon_counts_csv_file, taxoninfo_path,
                                   taxon_species_rpm_file, taxon_genus_rpm_file)
    logger.info("calculated RPM from taxon counts")
    # move the output back to S3
    execute_command("aws s3 cp %s %s/" % (taxon_counts_csv_file, sample_s3_output_path))
    execute_command("aws s3 cp %s %s/" % (taxon_counts_json_file, sample_s3_output_path))
    execute_command("aws s3 cp %s %s/" % (taxon_species_rpm_file, sample_s3_output_path))
    execute_command("aws s3 cp %s %s/" % (taxon_genus_rpm_file, sample_s3_output_path))
    logger.info("uploaded output")
    execute_command("aws s3 cp %s/%s %s/;" % (result_dir, LOGS_OUT, sample_s3_output_path))

def run_combine_json_outputs(sample_name, input_json_1, input_json_2, output_json, 
    result_dir, sample_s3_output_path, lazy_run):
    logger = logging.getLogger()
    logger.info("========== combine json outputs ==========")
    # Ignore lazyrun
    combine_json(input_json_1, input_json_2, output_json)
    logger.info("finished")
    # move it the output back to S3
    execute_command("aws s3 cp %s %s/" % (output_json, sample_s3_output_path))
    logger.info("uploaded output")
    execute_command("aws s3 cp %s/%s %s/;" % (result_dir, LOGS_OUT, sample_s3_output_path))

### Main
def main():
    global INPUT_BUCKET
    global OUTPUT_BUCKET
    global KEY_S3_PATH
    INPUT_BUCKET = os.environ.get('INPUT_BUCKET', INPUT_BUCKET)
    OUTPUT_BUCKET = os.environ.get('OUTPUT_BUCKET', OUTPUT_BUCKET)
    KEY_S3_PATH = os.environ.get('KEY_S3_PATH', KEY_S3_PATH)
    DB_SAMPLE_ID = os.environ['DB_SAMPLE_ID']
    SAMPLE_HOST = os.environ['SAMPLE_HOST']
    SAMPLE_LOCATION = os.environ['SAMPLE_LOCATION']
    SAMPLE_DATE = os.environ['SAMPLE_DATE']
    SAMPLE_TISSUE = os.environ['SAMPLE_TISSUE']
    SAMPLE_TEMPLATE = os.environ['SAMPLE_TEMPLATE']
    SAMPLE_LIBRARY = os.environ['SAMPLE_LIBRARY']
    SAMPLE_SEQUENCER = os.environ['SAMPLE_SEQUENCER']
    SAMPLE_NOTES = os.environ['SAMPLE_NOTES']
    sample_s3_input_path = INPUT_BUCKET.rstrip('/')
    sample_s3_output_path = OUTPUT_BUCKET.rstrip('/')
    
    run_sample(sample_s3_input_path, sample_s3_output_path,
               STAR_GENOME, BOWTIE2_GENOME,
               KEY_S3_PATH, KEY_S3_PATH, ACCESSION2TAXID,
               DEUTEROSTOME_TAXIDS, TAXID_TO_INFO, DB_SAMPLE_ID,
               SAMPLE_HOST, SAMPLE_LOCATION, SAMPLE_DATE, SAMPLE_TISSUE,
               SAMPLE_TEMPLATE, SAMPLE_LIBRARY, SAMPLE_SEQUENCER, SAMPLE_NOTES, True)

if __name__=="__main__":
    main()
