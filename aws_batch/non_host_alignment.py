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
import math
import threading

ENVIRONMENT = 'production'
INPUT_BUCKET = 's3://czbiohub-infectious-disease/UGANDA' # default to be overwritten by environment variable
FILE_TYPE = 'fastq.gz'
OUTPUT_BUCKET = 's3://czbiohub-idseq-samples-test/id-uganda'  # default to be overwritten by environment variable
ROOT_DIR = '/mnt'
DEST_DIR = ROOT_DIR + '/idseq/data' # generated data go here
REF_DIR  = ROOT_DIR + '/idseq/ref' # referene genome / ref databases go here

FILTER_HOST_FLAG = 1

GSNAPL_MAX_CONCURRENT = 20
RAPSEARCH2_MAX_CONCURRENT = 5

GSNAPL_CHUNK_SIZE = 1000 # number of fasta records in a chunk
RAPSEARCH_CHUNK_SIZE = 1000

ACCESSION2TAXID = 's3://czbiohub-infectious-disease/references/accession2taxid.db.gz'
DEUTEROSTOME_TAXIDS = 's3://czbiohub-infectious-disease/references/lineages-2017-03-17_deuterostome_taxIDs.txt'
TAXID_TO_INFO = 's3://czbiohub-infectious-disease/references/taxon_info.db'

TAX_LEVEL_SPECIES = 1
TAX_LEVEL_GENUS = 2

# output files
EXTRACT_UNMAPPED_FROM_SAM_OUT1 = 'unmapped.bowtie2.lzw.cdhitdup.priceseqfilter.unmapped.star.1.fasta'
EXTRACT_UNMAPPED_FROM_SAM_OUT2 = 'unmapped.bowtie2.lzw.cdhitdup.priceseqfilter.unmapped.star.2.fasta'
EXTRACT_UNMAPPED_FROM_SAM_OUT3 = 'unmapped.bowtie2.lzw.cdhitdup.priceseqfilter.unmapped.star.merged.fasta'
GSNAPL_OUT = 'gsnapl.unmapped.bowtie2.lzw.cdhitdup.priceseqfilter.unmapped.star.m8'
GSNAPL_DEDUP_OUT = 'dedup.gsnapl.unmapped.bowtie2.lzw.cdhitdup.priceseqfilter.unmapped.star.m8'
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
UNIDENTIFIED_FASTA_OUT = 'unidentified.fasta'
COMBINED_JSON_OUT = 'idseq_web_sample.json'
LOGS_OUT_BASENAME = 'log'
STATS_OUT = 'stats.json'
TARGET_OUTPUTS = { "run_gsnapl_remotely": [os.path.join(RESULT_DIR, ),
                                           os.path.join(RESULT_DIR, )],
                   "run_annotate_m8_with_taxids__1": ,
                   "run_generate_taxid_annotated_fasta_from_m8__1":
                   "run_filter_deuterostomes_from_m8__1":
                   "run_generate_taxid_outputs_from_m8":
                   "run_filter_deuterostomes_from_fasta"
                   "run_rapsearch2_remotely"
                   "run_annotate_m8_with_taxids"
                   "run_generate_taxid_annotated_fasta_from_m8__2"
                   "run_filter_deuterostomes_from_m8__2"
                   "run_generate_taxid_outputs_from_m8"
                   "run_combine_json_outputs"
                   "run_generate_unidentified_fasta" }

# global statistics log
STATS = []

### convenience functions
def chunk_input(input_files_basenames, chunk_nlines, part_suffix, result_dir)
    part_lists = []
    for input_file in input_files_basenames:
        input_file_full_local_path = os.path.join(result_dir, input_file)
        out_prefix = input_file_full_local_path + part_suffix
        execute_command("split --numeric-suffixes -l %d %s %s" % (chunk_nlines, input_file_full_local_path, out_prefix))
        execute_command("aws s3 cp %s* %s/" % (out_prefix, sample_s3_output_path))
        partial_files = [os.path.basename(partial_file) for partial_file in execute_command_with_output("ls %s*" % out_prefix).rstrip().split("\n")]
        part_lists += partial_files
    input_chunks = [list(part) for part in zip(*part_lists)]
    # e.g. [["input_R1.fasta-part-1", "input_R2.fasta-part-1"],["input_R1.fasta-part-2", "input_R2.fasta-part-2"],["input_R1.fasta-part-3", "input_R2.fasta-part-3"],...]
    return input_chunks

def clean_direct_gsnapl_input(fastq_files, file_type, sample_s3_output_path):
    # unzip files if necessary
    if ".gz" in file_type:
        subprocess.check_output(" ".join(["gunzip"] + fastq_files), shell=True)
        cleaned_files = [os.path.splitext(f) for f in fastq_files]
    else:
        cleaned_files = fastq_files
    # generate file type for log
    file_type_trimmed = file_type.split(".gz")[0]
    file_type_for_log = file_type_trimmed
    if len(fastq_files)==2:
        file_type_for_log += "_paired"
    # copy files to S3
    for f in cleaned_files:
        execute_command("aws s3 cp %s %s/" % (f, sample_s3_output_path))
    return cleaned_files, file_type_for_log

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
    while sequence_name and sequence_data:
        read_id = sequence_name.rstrip().lstrip('>')
        accession = read_to_accession_id.get(read_id, '')
        new_read_name = annotation_prefix + ':' + accession + ':' + read_id
        output_fasta_f.write(">%s\n" % new_read_name)
        output_fasta_f.write(sequence_data)
        sequence_name = input_fasta_f.readline()
        sequence_data = input_fasta_f.readline()
    input_fasta_f.close()
    output_fasta_f.close()

def deduplicate_m8(input_m8, output_m8):
    outf = open(output_m8, "wb")
    previous_read_name = ''
    with open(input_m8, "rb") as m8f:
        for line in m8f:
            if line[0] == '#':
                continue
            parts = line.split("\t")
            read_name = parts[0] # Example: HWI-ST640:828:H917FADXX:2:1108:8883:88679/1/1'
            if read_name == previous_read_name:
                continue
            outf.write(line)
            previous_read_name = read_name
    outf.close()

def generate_tax_counts_from_m8(m8_file, e_value_type, output_file):
    # uses m8 file with read names beginning as: "taxid<taxon ID>:"
    taxid_count_map = {}
    taxid_percent_identity_map = {}
    taxid_alignment_length_map = {}
    taxid_e_value_map = {}
    with open(m8_file, 'rb') as m8f:
        for line in m8f:
            taxid = (line.split("taxid"))[1].split(":")[0]
            #"taxid9606:NB501961:14:HM7TLBGX2:1:12104:15431..."
            percent_identity = float(line.split("\t")[2])
            alignment_length = float(line.split("\t")[3])
            e_value = float(line.split("\t")[10])
            if e_value_type != 'log10':
                e_value = math.log10(e_value)
            #m8 format (Blast format 8): query, subject, %id, alignment length, mismatches, gap openings, query start, query end,
            #                            subject start, subject end, E value (log10 if rapsearch2 output), bit score
            # E value is a negative power of 10. GSNAPL outputs raw e-value, RAPSearch2 outputs log10(e-value).
            # Whenever we use "e_value" it refers to log10(e-value), which is easier to handle.
            taxid_count_map[taxid] = taxid_count_map.get(taxid, 0) + 1
            taxid_percent_identity_map[taxid] = taxid_percent_identity_map.get(taxid, 0) + percent_identity
            taxid_alignment_length_map[taxid] = taxid_alignment_length_map.get(taxid, 0) + alignment_length
            taxid_e_value_map[taxid] = taxid_e_value_map.get(taxid, 0) + e_value
    with open(output_file, 'w') as f:
        for taxid in taxid_count_map.keys():
            count = taxid_count_map[taxid]
            avg_percent_identity = taxid_percent_identity_map[taxid] / count
            avg_alignment_length = taxid_alignment_length_map[taxid] / count
            avg_e_value = taxid_e_value_map[taxid] / count
            f.write(",".join([str(taxid), str(count), str(avg_percent_identity), str(avg_alignment_length), str(avg_e_value) + '\n']))

def generate_rpm_from_taxid_counts(taxidCountsInputPath, taxid2infoPath, speciesOutputPath, genusOutputPath):
    total_reads = [item for item in STATS if "total_reads" in item][0]["total_reads"]
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

def generate_json_from_taxid_counts(sample, taxidCountsInputPath,
                                    taxid2infoPath, jsonOutputPath, countType, dbSampleId):
    taxid2info_map = shelve.open(taxid2infoPath)
    total_reads = [item for item in STATS if "total_reads" in item][0]["total_reads"]
    taxon_counts_attributes = []
    remaining_reads = (item for item in STATS if item.get("task") == "run_gsnapl_remotely").next().get("reads_before")

    genus_to_count = {}
    genus_to_name = {}
    species_to_count = {}
    species_to_name = {}
    species_to_percent_identity = {}
    species_to_alignment_length = {}
    species_to_e_value = {}
    with open(taxidCountsInputPath) as f:
        for line in f:
            tok = line.rstrip().split(",")
            taxid = tok[0]
            count = float(tok[1])
            percent_identity = float(tok[2])
            alignment_length = float(tok[3])
            e_value = float(tok[4])
            species_taxid, genus_taxid, scientific_name = taxid2info_map.get(taxid, ("-1", "-2", "NA"))
            genus_to_count[genus_taxid] = genus_to_count.get(genus_taxid, 0) + count
            genus_to_name[genus_taxid]  = scientific_name.split(" ")[0]
            species_to_count[species_taxid] = species_to_count.get(species_taxid, 0) + count
            species_to_name[species_taxid] = scientific_name
            species_to_percent_identity[species_taxid] = species_to_percent_identity.get(species_taxid, 0) + count * percent_identity
            species_to_alignment_length[species_taxid] = species_to_alignment_length.get(species_taxid, 0) + count * alignment_length
            species_to_e_value[species_taxid] = species_to_e_value.get(species_taxid, 0) + count * e_value

    for taxid in species_to_count.keys():
        species_name = species_to_name[taxid]
        count = species_to_count[taxid]
        avg_percent_identity = species_to_percent_identity[taxid] / count
        avg_alignment_length = species_to_alignment_length[taxid] / count
        avg_e_value = species_to_e_value[taxid] / count
        taxon_counts_attributes.append({"tax_id": taxid,
                                        "tax_level": TAX_LEVEL_SPECIES,
                                        "count": count,
                                        "percent_identity": avg_percent_identity,
                                        "alignment_length": avg_alignment_length,
                                        "e_value": avg_e_value,
                                        "name": species_name,
                                        "count_type": countType})

    output_dict = {
        "pipeline_output": {
            "total_reads": total_reads,
            "remaining_reads": remaining_reads,
            "sample_id": dbSampleId,
            "taxon_counts_attributes": taxon_counts_attributes
      }
    }
    with open(jsonOutputPath, 'wb') as outf:
        json.dump(output_dict, outf)

def combine_pipeline_output_json(inputPath1, inputPath2, outputPath):
    total_reads = [item for item in STATS if "total_reads" in item][0]["total_reads"]
    remaining_reads = (item for item in STATS if item.get("task") == "run_gsnapl_remotely").next().get("reads_before")
    with open(inputPath1) as inf1:
        input1 = json.load(inf1).get("pipeline_output")
    with open(inputPath2) as inf2:
        input2 = json.load(inf2).get("pipeline_output")
    taxon_counts_attributes = (input1.get("taxon_counts_attributes")
                              + input2.get("taxon_counts_attributes"))
    pipeline_output_dict = {
        "total_reads": total_reads,
        "remaining_reads": remaining_reads,
        "taxon_counts_attributes": taxon_counts_attributes
    }
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

def generate_merged_fasta(input_files, output_file):
    with open(output_file, 'w') as outfile:
        for fname in input_files:
            idx = input_files.index(fname) + 1
            with open(fname) as infile:
                for line in infile:
                    if line.startswith(">"):
                        suffix = "/" + str(idx)
                    else:
                        suffix = ""
                    outfile.write(line.rstrip() + suffix + "\n")

def read_file_into_list(file_name):
    with open(file_name) as f:
        L = [x.rstrip() for x in f if x]
    return L

def filter_deuterostomes_from_m8(input_m8, output_m8, deuterostome_file):
    taxids_toremove = read_file_into_list(deuterostome_file)
    output_f = open(output_m8, 'wb')
    with open(input_m8, "rb") as input_f:
        for line in input_f:
            taxid = (line.split("taxid"))[1].split(":")[0]
            #"taxid9606:NB501961:14:HM7TLBGX2:1:12104:15431:..."
            if not taxid in taxids_toremove:
                output_f.write(line)
    output_f.close()

def filter_taxids_from_fasta(input_fa, output_fa, annotation_prefix, accession2taxid_path, deuterostome_file):
    taxids_toremove = read_file_into_list(deuterostome_file)
    accession2taxid_dict = shelve.open(accession2taxid_path)
    input_f = open(input_fa, 'rb')
    output_f = open(output_fa, 'wb')
    sequence_name = input_f.readline()
    sequence_data = input_f.readline()
    while sequence_name and sequence_data:
        read_id = sequence_name.rstrip().lstrip('>') # example read_id: "NR::NT:CP010376.2:NB501961:14:HM7TLBGX2:1:23109:12720:8743/2"
        split_on = annotation_prefix + ":"
        if not read_id.startswith(annotation_prefix):
            split_on = ":" + split_on # avoid any possible "NT:" where the NT could be part of the accession follwing "NR:"
        accession_id = (read_id.split(split_on))[1].split(":")[0]
        accession_id_short = accession_id.split(".")[0]
        taxid = accession2taxid_dict.get(accession_id_short, "NA")
        if not taxid in taxids_toremove:
            output_f.write(sequence_name)
            output_f.write(sequence_data)
        sequence_name = input_f.readline()
        sequence_data = input_f.readline()
    input_f.close()
    output_f.close()

def return_merged_dict(dict1, dict2):
    result = dict1.copy()
    result.update(dict2)
    return result

### job functions

def environment_for_aligners(environment):
    return "production" ## temporary fix since we only have "production" gsnap/rapsearch machines right now

def get_key_path(environment):
    return "s3://czbiohub-infectious-disease/idseq-%s.pem" % environment_for_aligners(environment)

def wait_for_server(service_name, command, max_concurrent):
    while True:
        output = execute_command_with_output(command).rstrip().split("\n")
        if len(output) <= max_concurrent:
            print "%s server has capacity. Kicking off " % service_name
            return
        else:
            wait_seconds = random.randint(30, 60)
            print "%s server busy. %d processes running. Wait for %d seconds" % \
                  (service_name, len(output), wait_seconds)
            time.sleep(wait_seconds)

def get_server_ips(service_name, environment):
    tag = "service"
    value = "%s-%s" % (service_name, environment_for_aligners(environment))
    describe_json = json.loads(execute_command_with_output("aws ec2 describe-instances --filters 'Name=tag:%s,Values=%s' 'Name=instance-state-name,Values=running'" % (tag, value)))
    server_ips = []
    for reservation in describe_json["Reservations"]:
        for instance in reservation["Instances"]:
            server_ips += [instance["NetworkInterfaces"][0]["Association"]["PublicIp"]]
    return server_ips

def wait_for_server_ip(service_name, key_path, remote_username, environment, max_concurrent):
    instance_ips = get_server_ips(service_name, environment)
    i = 1
    while True:
        if i % 10 == 0: instance_ips = get_server_ips(service_name, environment)
        ip_nproc_dict = {}
        for ip in instance_ips:
            command = 'ssh -o "StrictHostKeyChecking no" -i %s %s@%s "ps aux|grep gsnapl|grep -v bash" || echo "error"' % (key_path, remote_username, ip)
            output = execute_command_with_output(command).rstrip().split("\n")
            if output != ["error"]: ip_nproc_dict[ip] = len(output)
        if not ip_nproc_dict:
            have_capacity = False
        else:
            min_nproc_ip = min(ip_nproc_dict, key=ip_nproc_dict.get)
            min_nproc = ip_nproc_dict[min_nproc_ip]
            have_capacity = (min_nproc <= max_concurrent)
        if have_capacity:
            print "%s server %s has capacity. Kicking off " % (service_name, min_nproc_ip)
            return min_nproc_ip
        else:
            wait_seconds = random.randint(30, 60)
            print "%s servers busy. Wait for %d seconds" % \
                  (service_name, wait_seconds)
            time.sleep(wait_seconds)
            i += 1

def run_stage2(sample_s3_input_path, file_type, filter_host_flag, sample_s3_output_path,
               gsnap_ssh_key_s3_path, rapsearch_ssh_key_s3_path, accession2taxid_s3_path,
               deuterostome_list_s3_path, taxid2info_s3_path, db_sample_id,
               aws_batch_job_id, environment, lazy_run = True):

    sample_s3_output_path = sample_s3_output_path.rstrip('/')
    sample_name = sample_s3_input_path[5:].rstrip('/').replace('/','-')
    sample_dir = DEST_DIR + '/' + sample_name
    fastq_dir = sample_dir + '/fastqs'
    result_dir = sample_dir + '/results'
    scratch_dir = sample_dir + '/scratch'
    execute_command("mkdir -p %s %s %s %s" % (sample_dir, fastq_dir, result_dir, scratch_dir))
    execute_command("mkdir -p %s " % REF_DIR)

    # configure logger
    log_file = "%s/%s.%s.txt" % (result_dir, LOGS_OUT_BASENAME, aws_batch_job_id)
    logger = logging.getLogger()
    logger.setLevel(logging.INFO)
    handler = logging.FileHandler(log_file)
    formatter = logging.Formatter("%(asctime)s (%(time_since_last)ss elapsed): %(message)s")
    handler.addFilter(TimeFilter())
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    # now also echo to stdout so they get to cloudwatch
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(logging.INFO)
    formatter = logging.Formatter('(%(time_since_last)ss elapsed): %(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    DEFAULT_LOGPARAMS = {"sample_s3_output_path": sample_s3_output_path,
                         "stats_file": os.path.join(result_dir, STATS_OUT)}

    # Download input files if stage1 was skipped
    if not filter_host_flag:
        command = "aws s3 ls %s/ | grep '\.%s$'" % (sample_s3_input_path, file_type)
        output = execute_command_with_output(command).rstrip().split("\n")
        for line in output:
            m = re.match(".*?([^ ]*." + re.escape(file_type) + ")", line)
            if m:
                execute_command("aws s3 cp %s/%s %s/" % (sample_s3_input_path, m.group(1), fastq_dir))
            else:
                print "%s doesn't match %s" % (line, file_type)

        fastq_files = execute_command_with_output("ls %s/*.%s" % (fastq_dir, file_type)).rstrip().split("\n")

    if lazy_run:
        # Download existing data and see what has been done
        ## NOTE: OUTPUT_BUCKETS for all the stages need to be distinct for this to work properly.
        command = "aws s3 cp %s %s --recursive" % (sample_s3_output_path, result_dir)
        print execute_command_with_output(command)

    # Import existing job stats
    stats_file = os.path.join(result_dir, STATS_OUT)
    with open(stats_file) as f:
        STATS = json.load(f)

    # run gsnap remotely
    if filter_host_flag:
        gsnapl_input_files = [EXTRACT_UNMAPPED_FROM_SAM_OUT1, EXTRACT_UNMAPPED_FROM_SAM_OUT2]
        before_file_name_for_log = os.path.join(result_dir, EXTRACT_UNMAPPED_FROM_SAM_OUT1)
        before_file_type_for_log = "fasta_paired"
    else:
        cleaned_files, before_file_type_for_log = clean_direct_gsnapl_input(fastq_files, file_type, sample_s3_output_path)
        before_file_name_for_log = cleaned_files[0]
        gsnapl_input_files = [os.path.basename(f) for f in cleaned_files]

    logparams = return_merged_dict(DEFAULT_LOGPARAMS,
        {"title": "GSNAPL", "count_reads": True,
        "before_file_name": before_file_name_for_log,
        "before_file_type": before_file_type_for_log,
        "after_file_name": os.path.join(result_dir, GSNAPL_OUT),
        "after_file_type": "m8"})
    run_and_log(logparams, TARGET_OUTPUTS, lazy_run, run_gsnapl_remotely,
        sample_name, gsnapl_input_files,
        gsnap_ssh_key_s3_path, environment, aws_batch_job_id,
        result_dir, sample_s3_output_path)

    # run_annotate_gsnapl_m8_with_taxids
    logparams = return_merged_dict(DEFAULT_LOGPARAMS,
        {"title": "annotate gsnapl m8 with taxids",
        "count_reads": False})
    run_and_log(logparams, TARGET_OUTPUTS, False, run_annotate_m8_with_taxids,
        sample_name, os.path.join(result_dir, GSNAPL_DEDUP_OUT),
        os.path.join(result_dir, ANNOTATE_GSNAPL_M8_WITH_TAXIDS_OUT),
        accession2taxid_s3_path, result_dir, sample_s3_output_path)

    # run_generate_taxid_annotated_fasta_from_m8
    logparams = return_merged_dict(DEFAULT_LOGPARAMS,
        {"title": "generate taxid annotated fasta from m8",
        "count_reads": False})
    run_and_log(logparams, TARGET_OUTPUTS, False, run_generate_taxid_annotated_fasta_from_m8,
        sample_name, os.path.join(result_dir, GSNAPL_DEDUP_OUT),
        os.path.join(result_dir, EXTRACT_UNMAPPED_FROM_SAM_OUT3),
        os.path.join(result_dir, GENERATE_TAXID_ANNOTATED_FASTA_FROM_M8_OUT),
        'NT', result_dir, sample_s3_output_path)

    logparams = return_merged_dict(DEFAULT_LOGPARAMS,
        {"title": "filter deuterostomes from m8", "count_reads": True,
        "before_file_name": os.path.join(result_dir, ANNOTATE_GSNAPL_M8_WITH_TAXIDS_OUT),
        "before_file_type": "m8",
        "after_file_name": os.path.join(result_dir, FILTER_DEUTEROSTOMES_FROM_NT_M8_OUT),
        "after_file_type": "m8"})
    run_and_log(logparams, TARGET_OUTPUTS, False, run_filter_deuterostomes_from_m8,
        sample_name, os.path.join(result_dir, ANNOTATE_GSNAPL_M8_WITH_TAXIDS_OUT),
        os.path.join(result_dir, FILTER_DEUTEROSTOMES_FROM_NT_M8_OUT),
        deuterostome_list_s3_path, result_dir, sample_s3_output_path)

    logparams = return_merged_dict(DEFAULT_LOGPARAMS,
        {"title": "generate taxid outputs from m8",
        "count_reads": False})
    run_and_log(logparams, TARGET_OUTPUTS, False, run_generate_taxid_outputs_from_m8,
        sample_name, os.path.join(result_dir, FILTER_DEUTEROSTOMES_FROM_NT_M8_OUT),
        os.path.join(result_dir, NT_M8_TO_TAXID_COUNTS_FILE_OUT),
        os.path.join(result_dir, NT_TAXID_COUNTS_TO_JSON_OUT),
        os.path.join(result_dir, NT_TAXID_COUNTS_TO_SPECIES_RPM_OUT),
        os.path.join(result_dir, NT_TAXID_COUNTS_TO_GENUS_RPM_OUT),
        taxid2info_s3_path, 'NT', 'raw', db_sample_id,
        result_dir, sample_s3_output_path)

    # run rapsearch remotely
    logparams = return_merged_dict(DEFAULT_LOGPARAMS,
        {"title": "filter deuterostomes from FASTA",
        "count_reads": False})
    run_and_log(logparams, TARGET_OUTPUTS, False, run_filter_deuterostomes_from_fasta,
        sample_name, os.path.join(result_dir, GENERATE_TAXID_ANNOTATED_FASTA_FROM_M8_OUT),
        os.path.join(result_dir, FILTER_DEUTEROSTOME_FROM_TAXID_ANNOTATED_FASTA_OUT),
        accession2taxid_s3_path, deuterostome_list_s3_path, 'NT',
        result_dir, sample_s3_output_path)

    logparams = return_merged_dict(DEFAULT_LOGPARAMS,
        {"title": "RAPSearch2", "count_reads": True,
        "before_file_name": os.path.join(result_dir, FILTER_DEUTEROSTOME_FROM_TAXID_ANNOTATED_FASTA_OUT),
        "before_file_type": "fasta",
        "after_file_name": os.path.join(result_dir, RAPSEARCH2_OUT),
        "after_file_type": "m8"})
    run_and_log(logparams, TARGET_OUTPUTS, lazy_run, run_rapsearch2_remotely,
        sample_name, FILTER_DEUTEROSTOME_FROM_TAXID_ANNOTATED_FASTA_OUT,
        rapsearch_ssh_key_s3_path, environment, aws_batch_job_id,
        result_dir, sample_s3_output_path)

    # run_annotate_m8_with_taxids
    logparams = return_merged_dict(DEFAULT_LOGPARAMS,
        {"title": "annotate m8 with taxids",
        "count_reads": False})
    run_and_log(logparams, TARGET_OUTPUTS, False, run_annotate_m8_with_taxids,
        sample_name, os.path.join(result_dir, RAPSEARCH2_OUT),
        os.path.join(result_dir, ANNOTATE_RAPSEARCH2_M8_WITH_TAXIDS_OUT),
        accession2taxid_s3_path, result_dir, sample_s3_output_path)

    # run_generate_taxid_annotated_fasta_from_m8
    merged_fasta = os.path.join(result_dir, EXTRACT_UNMAPPED_FROM_SAM_OUT3)
    if not os.path.isfile(merged_fasta):
        # make the EXTRACT_UNMAPPED_FROM_SAM_OUT3 input needed below
        generate_merged_fasta(cleaned_files, merged_fasta)
    logparams = return_merged_dict(DEFAULT_LOGPARAMS,
        {"title": "generate taxid annotated fasta from m8",
        "count_reads": False})
    run_and_log(logparams, TARGET_OUTPUTS, False, run_generate_taxid_annotated_fasta_from_m8,
        sample_name, result_dir + '/' + RAPSEARCH2_OUT,
        result_dir + '/' + FILTER_DEUTEROSTOME_FROM_TAXID_ANNOTATED_FASTA_OUT,
        result_dir + '/' + GENERATE_TAXID_ANNOTATED_FASTA_FROM_RAPSEARCH2_M8_OUT,
        'NR', result_dir, sample_s3_output_path)

    logparams = return_merged_dict(DEFAULT_LOGPARAMS,
        {"title": "filter deuterostomes from m8", "count_reads": True,
        "before_file_name": os.path.join(result_dir, ANNOTATE_RAPSEARCH2_M8_WITH_TAXIDS_OUT),
        "before_file_type": "m8",
        "after_file_name": os.path.join(result_dir, FILTER_DEUTEROSTOMES_FROM_NR_M8_OUT),
        "after_file_type": "m8"})
    run_and_log(logparams, TARGET_OUTPUTS, False, run_filter_deuterostomes_from_m8,
        sample_name, os.path.join(result_dir, ANNOTATE_RAPSEARCH2_M8_WITH_TAXIDS_OUT),
        os.path.join(result_dir, FILTER_DEUTEROSTOMES_FROM_NR_M8_OUT),
        deuterostome_list_s3_path, result_dir, sample_s3_output_path)

    logparams = return_merged_dict(DEFAULT_LOGPARAMS,
        {"title": "generate taxid outputs from m8",
        "count_reads": False})
    run_and_log(logparams, TARGET_OUTPUTS, False, run_generate_taxid_outputs_from_m8,
        sample_name, os.path.join(result_dir, FILTER_DEUTEROSTOMES_FROM_NR_M8_OUT),
        os.path.join(result_dir, NR_M8_TO_TAXID_COUNTS_FILE_OUT),
        os.path.join(result_dir, NR_TAXID_COUNTS_TO_JSON_OUT),
        os.path.join(result_dir, NR_TAXID_COUNTS_TO_SPECIES_RPM_OUT),
        os.path.join(result_dir, NR_TAXID_COUNTS_TO_GENUS_RPM_OUT),
        taxid2info_s3_path, 'NR', 'log10', db_sample_id,
        result_dir, sample_s3_output_path)

    logparams = return_merged_dict(DEFAULT_LOGPARAMS,
        {"title": "combine JSON outputs",
        "count_reads": False})
    run_and_log(logparams, TARGET_OUTPUTS, False, run_combine_json_outputs,
        result_dir + '/' + NT_TAXID_COUNTS_TO_JSON_OUT,
        result_dir + '/' + NR_TAXID_COUNTS_TO_JSON_OUT,
        result_dir + '/' + COMBINED_JSON_OUT,
        result_dir, sample_s3_output_path)

    logparams = return_merged_dict(DEFAULT_LOGPARAMS,
        {"title": "generate FASTA of unidentified reads", "count_reads": True,
        "before_file_name": os.path.join(result_dir, GENERATE_TAXID_ANNOTATED_FASTA_FROM_RAPSEARCH2_M8_OUT),
        "before_file_type": "fasta",
        "after_file_name": os.path.join(result_dir, UNIDENTIFIED_FASTA_OUT),
        "after_file_type": "fasta"})
    run_and_log(logparams, TARGET_OUTPUTS, False, run_generate_unidentified_fasta,
        sample_name, result_dir + '/' + GENERATE_TAXID_ANNOTATED_FASTA_FROM_RAPSEARCH2_M8_OUT,
        result_dir + '/' + UNIDENTIFIED_FASTA_OUT,
        result_dir, sample_s3_output_path)

def run_gsnapl_chunk(part_suffix, remote_home_dir, remote_index_dir, remote_work_dir, remote_username,
                     input_files, key_path, environment, result_dir, sample_s3_output_path)
        chunk_id = input_files[0].split(part_suffix)[-1]
        outfile_basename = 'gsnapl-out' + part_suffix + chunk_id
        dedup_outfile_basename = 'dedup-' + outfile_basename
        remote_outfile = os.path.join(remote_work_dir, outfile_basename)
        commands = "mkdir -p %s;" % remote_work_dir
        for input_fa in input_files:
            commands += "aws s3 cp %s/%s %s/ ; " % \
                     (sample_s3_output_path, input_fa, remote_work_dir)
        commands += " ".join([remote_home_dir+'/bin/gsnapl',
                              '-A', 'm8', '--batch=2',
                              '--gmap-mode=none', '--npaths=1', '--ordered',
                              '-t', '32',
                              '--maxsearch=5', '--max-mismatches=20',
                              '-D', remote_index_dir, '-d', 'nt_k16']
                              + [remote_work_dir+'/'+input_fa for input_fa in input_files]
                              + ['> '+remote_outfile, ';'])
        commands += "aws s3 cp %s %s/;" % (remote_outfile, sample_s3_output_path)
        # check if remote machins has enough capacity
        logging.getLogger().info("waiting for server")
        gsnapl_instance_ip = wait_for_server_ip('gsnap', key_path, remote_username, environment, GSNAPL_MAX_CONCURRENT)
        logging.getLogger().info("starting alignment for chunk %s on machine %s" % (chunk_id, gsnapl_instance_ip))
        remote_command = 'ssh -o "StrictHostKeyChecking no" -i %s %s@%s "%s"' % (key_path, remote_username, gsnapl_instance_ip, commands)
        execute_command(remote_command)
        # move gsnapl output back to local
        time.sleep(10)
        logging.getLogger().info("finished alignment for chunk %s" % chunk_id)
        execute_command("aws s3 cp %s/%s %s/" % (sample_s3_output_path, outfile_basename, result_dir))
        # Deduplicate m8 input. Sometimes GSNAPL outputs multiple consecutive lines for same original read and same accession id. Count functions expect only 1 (top hit).
        deduplicate_m8(os.path.join(result_dir, outfile_basename), os.path.join(result_dir, dedup_outfile_basename))
        execute_command("aws s3 cp %s/%s %s/" % (result_dir, dedup_outfile_basename, sample_s3_output_path))
        return os.path.join(result_dir, dedup_outfile_basename)

def run_gsnapl_remotely(sample, input_files,
                        gsnap_ssh_key_s3_path, environment, aws_batch_job_id,
                        result_dir, sample_s3_output_path):
    key_name = os.path.basename(gsnap_ssh_key_s3_path)
    execute_command("aws s3 cp %s %s/" % (gsnap_ssh_key_s3_path, REF_DIR))
    key_path = REF_DIR +'/' + key_name
    execute_command("chmod 400 %s" % key_path)
    remote_username = "ubuntu"
    remote_home_dir = "/home/%s" % remote_username
    remote_work_dir = "%s/batch-pipeline-workdir/%s" % (remote_home_dir, sample)
    remote_index_dir = "%s/share" % remote_home_dir
    # split file:
    chunk_nlines = 2*GSNAPL_CHUNK_SIZE
    part_suffix = "-part-"
    input_chunks = chunk_input(input_files, chunk_nlines, part_suffix, result_dir)
    # process chunks:
    chunk_output_files = []
    for chunk_input_files in input_chunks:
        chunk_output_files += [run_gsnapl_chunk(part_suffix, remote_home_dir, remote_index_dir, remote_work_dir, remote_username,
                                                chunk_input_files, key_path, environment, result_dir, sample_s3_output_path)]
    # merge output chunks:
    execute_command("cat %s > %s" % (" ".join(chunk_output_files), os.path.join(result_dir, GSNAPL_DEDUP_OUT))
    execute_command("aws s3 cp %s/%s %s/" % (result_dir, GSNAPL_DEDUP_OUT, sample_s3_output_path))

def run_annotate_m8_with_taxids(sample_name, input_m8, output_m8, accession2taxid_s3_path, result_dir, sample_s3_output_path):
    accession2taxid_gz = os.path.basename(accession2taxid_s3_path)
    accession2taxid_path = REF_DIR + '/' + accession2taxid_gz[:-3]
    if not os.path.isfile(accession2taxid_path):
        execute_command("aws s3 cp %s %s/" % (accession2taxid_s3_path, REF_DIR))
        execute_command("cd %s; gunzip %s" % (REF_DIR, accession2taxid_gz))
        logging.getLogger().info("downloaded accession-to-taxid map")
    generate_taxid_annotated_m8(input_m8, output_m8, accession2taxid_path)
    logging.getLogger().info("finished annotation")
    # move the output back to S3
    execute_command("aws s3 cp %s %s/" % (output_m8, sample_s3_output_path))

def run_filter_deuterostomes_from_m8(sample_name, input_m8, output_m8,
                                     deuterostome_list_s3_path,
                                     result_dir, sample_s3_output_path):
    deuterostome_file_basename = os.path.basename(deuterostome_list_s3_path)
    deuterostome_file = os.path.join(REF_DIR, deuterostome_file_basename)
    if not os.path.isfile(deuterostome_file):
        execute_command("aws s3 cp %s %s/" % (deuterostome_list_s3_path, REF_DIR))
        logging.getLogger().info("downloaded deuterostome list")
    filter_deuterostomes_from_m8(input_m8, output_m8, deuterostome_file)
    logging.getLogger().info("finished job")
    # move the output back to S3
    execute_command("aws s3 cp %s %s/" % (output_m8, sample_s3_output_path))

def run_generate_taxid_annotated_fasta_from_m8(sample_name, input_m8, input_fasta,
    output_fasta, annotation_prefix, result_dir, sample_s3_output_path):
    generate_taxid_annotated_fasta_from_m8(input_fasta, input_m8, output_fasta, annotation_prefix)
    logging.getLogger().info("finished job")
    # move the output back to S3
    execute_command("aws s3 cp %s %s/" % (output_fasta, sample_s3_output_path))

def run_filter_deuterostomes_from_fasta(sample_name, input_fa, output_fa,
    accession2taxid_s3_path, deuterostome_list_s3_path, annotation_prefix,
    result_dir, sample_s3_output_path):
    accession2taxid_gz = os.path.basename(accession2taxid_s3_path)
    accession2taxid_path = REF_DIR + '/' + accession2taxid_gz[:-3]
    if not os.path.isfile(accession2taxid_path):
        execute_command("aws s3 cp %s %s/" % (accession2taxid_s3_path, REF_DIR))
        execute_command("cd %s; gunzip %s" % (REF_DIR, accession2taxid_gz))
        logging.getLogger().info("downloaded accession-to-taxid map")
    deuterostome_file_basename = os.path.basename(deuterostome_list_s3_path)
    deuterostome_file = os.path.join(REF_DIR, deuterostome_file_basename)
    if not os.path.isfile(deuterostome_file):
        execute_command("aws s3 cp %s %s/" % (deuterostome_list_s3_path, REF_DIR))
        logging.getLogger().info("downloaded deuterostome list")
    filter_taxids_from_fasta(input_fa, output_fa, annotation_prefix, accession2taxid_path, deuterostome_file)
    logging.getLogger().info("finished job")
    # move the output back to S3
    execute_command("aws s3 cp %s %s/" % (output_fa, sample_s3_output_path))

def run_rapsearch2_remotely(sample, input_fasta, rapsearch_ssh_key_s3_path,
    environment, aws_batch_job_id, result_dir, sample_s3_output_path):
    key_name = os.path.basename(rapsearch_ssh_key_s3_path)
    execute_command("aws s3 cp %s %s/" % (rapsearch_ssh_key_s3_path, REF_DIR))
    key_path = REF_DIR +'/' + key_name
    execute_command("chmod 400 %s" % key_path)
    remote_username = "ec2-user"
    remote_home_dir = "/home/%s" % remote_username
    remote_work_dir = "%s/batch-pipeline-workdir/%s" % (remote_home_dir, sample)
    remote_index_dir = "%s/references/nr_rapsearch" % remote_home_dir
    # split file:
    chunk_nlines = 2*RAPSEARCH_CHUNK_SIZE
    part_suffix = "-part-"
    input_chunks = chunk_input([input_fasta], chunk_nlines, part_suffix, result_dir)
    # process chunks:
    chunk_output_files = []
    for chunk_input_file in input_chunks:
        chunk_output_files += [run_rapsearch_chunk(part_suffix, remote_home_dir, remote_index_dir, remote_work_dir, remote_username,
                                                   chunk_input_file[0], key_path, environment, result_dir, sample_s3_output_path)]
    # merge output chunks:
    execute_command("cat %s > %s" % (" ".join(chunk_output_files), os.path.join(result_dir, RAPSEARCH2_OUT))
    execute_command("aws s3 cp %s/%s %s/" % (result_dir, RAPSEARCH2_OUT, sample_s3_output_path))

def run_rapsearch_chunk(part_suffix, remote_home_dir, remote_index_dir, remote_work_dir, remote_username,
                        input_fasta, key_path, environment, result_dir, sample_s3_output_path)
    chunk_id = input_fasta.split(part_suffix)[-1]
    commands = "mkdir -p %s;" % remote_work_dir
    commands += "aws s3 cp %s/%s %s/ ; " % \
                 (sample_s3_output_path, input_fasta, remote_work_dir)
    input_path = remote_work_dir + '/' + input_fasta
    outfile_basename = 'rapsearch2-out' + part_suffix + chunk_id
    output_path = os.path.join(remote_work_dir, outfile_basename) 
    commands += " ".join(['/usr/local/bin/rapsearch',
                          '-d', remote_index_dir+'/nr_rapsearch',
                          '-e','-6',
                          '-l','10',
                          '-a','T',
                          '-b','0',
                          '-v','1',
                          '-z', str(multiprocessing.cpu_count()),
                          '-q', input_path,
                          '-o', output_path[:-3],
                          ';'])
    commands += "aws s3 cp %s %s/;" % (output_path, sample_s3_output_path)
    logging.getLogger().info("waiting for server")
    instance_ip = wait_for_server_ip('rapsearch', key_path, remote_username, environment, RAPSEARCH2_MAX_CONCURRENT)
    logging.getLogger().info("starting alignment for chunk %s on machine %s" % (chunk_id, instance_ip))
    remote_command = 'ssh -o "StrictHostKeyChecking no" -i %s %s@%s "%s"' % (key_path, remote_username, instance_ip, commands)
    execute_command_realtime_stdout(remote_command)
    logging.getLogger().info("finished alignment for chunk %s" % chunk_id)
    # move output back to local
    time.sleep(10) # wait until the data is synced
    execute_command("aws s3 cp %s/%s %s/" % (sample_s3_output_path, outfile_basename, result_dir))
    return os.path.join(result_dir, outfile_basename)

def run_generate_taxid_outputs_from_m8(sample_name,
    annotated_m8,
    taxon_counts_csv_file, taxon_counts_json_file,
    taxon_species_rpm_file, taxon_genus_rpm_file,
    taxinfodb_s3_path, count_type, e_value_type, db_sample_id,
    result_dir, sample_s3_output_path):
    # download taxoninfodb if not exist
    taxoninfo_filename = os.path.basename(taxinfodb_s3_path)
    taxoninfo_path = REF_DIR + '/' + taxoninfo_filename
    if not os.path.isfile(taxoninfo_path):
        execute_command("aws s3 cp %s %s/" % (taxinfodb_s3_path, REF_DIR))
        logging.getLogger().info("downloaded taxon info database")
    generate_tax_counts_from_m8(annotated_m8, e_value_type, taxon_counts_csv_file)
    logging.getLogger().info("generated taxon counts from m8")
    generate_json_from_taxid_counts(sample_name, taxon_counts_csv_file,
                                    taxoninfo_path, taxon_counts_json_file,
                                    count_type, db_sample_id)
    logging.getLogger().info("generated JSON file from taxon counts")
    generate_rpm_from_taxid_counts(taxon_counts_csv_file, taxoninfo_path,
                                   taxon_species_rpm_file, taxon_genus_rpm_file)
    logging.getLogger().info("calculated RPM from taxon counts")
    # move the output back to S3
    execute_command("aws s3 cp %s %s/" % (taxon_counts_csv_file, sample_s3_output_path))
    execute_command("aws s3 cp %s %s/" % (taxon_counts_json_file, sample_s3_output_path))
    execute_command("aws s3 cp %s %s/" % (taxon_species_rpm_file, sample_s3_output_path))
    execute_command("aws s3 cp %s %s/" % (taxon_genus_rpm_file, sample_s3_output_path))

def run_combine_json_outputs(input_json_1, input_json_2, output_json,
    result_dir, sample_s3_output_path):
    combine_pipeline_output_json(input_json_1, input_json_2, output_json)
    logging.getLogger().info("finished job")
    # move it the output back to S3
    execute_command("aws s3 cp %s %s/" % (output_json, sample_s3_output_path))

def run_generate_unidentified_fasta(sample_name, input_fa, output_fa,
    result_dir, sample_s3_output_path):
    subprocess.check_output("grep -A 1 '>NR::NT::' %s | sed '/^--$/d' > %s" % (input_fa, output_fa), shell=True)
    logging.getLogger().info("finished job")
    execute_command("aws s3 cp %s %s/" % (output_fa, sample_s3_output_path))

### Main
def main():
    # Unbuffer stdout and redirect stderr into stdout.  This helps observe logged events in realtime.
    sys.stdout = os.fdopen(sys.stdout.fileno(), 'w', 0)
    os.dup2(sys.stdout.fileno(), sys.stderr.fileno())

    # collect environment variables
    global INPUT_BUCKET
    global FILE_TYPE
    global OUTPUT_BUCKET
    global ENVIRONMENT

    INPUT_BUCKET = os.environ.get('INPUT_BUCKET', INPUT_BUCKET)
    FILE_TYPE = os.environ.get('FILE_TYPE', FILE_TYPE)
    OUTPUT_BUCKET = os.environ.get('OUTPUT_BUCKET', OUTPUT_BUCKET)
    DB_SAMPLE_ID = os.environ['DB_SAMPLE_ID']
    AWS_BATCH_JOB_ID = os.environ.get('AWS_BATCH_JOB_ID', 'local')
    ENVIRONMENT = os.environ.get('ENVIRONMENT', ENVIRONMENT)

    sample_s3_input_path = INPUT_BUCKET.rstrip('/')
    sample_s3_output_path = OUTPUT_BUCKET.rstrip('/')
    key_s3_path = get_key_path(ENVIRONMENT)

    run_stage2(sample_s3_input_path, FILE_TYPE, FILTER_HOST_FLAG, sample_s3_output_path,
               key_s3_path, key_s3_path, ACCESSION2TAXID,
               DEUTEROSTOME_TAXIDS, TAXID_TO_INFO, DB_SAMPLE_ID,
               AWS_BATCH_JOB_ID, ENVIRONMENT, True)

if __name__=="__main__":
    main()
