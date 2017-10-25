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

KEY_S3_PATH = 's3://czbiohub-infectious-disease/idseq-alpha.pem'
ROOT_DIR = '/mnt'
DEST_DIR = ROOT_DIR + '/idseq/data' # generated data go here
REF_DIR  = ROOT_DIR + '/idseq/ref' # referene genome / ref databases go here

ACCESSION2TAXID = 's3://czbiohub-infectious-disease/references/accession2taxid.db.gz'
LINEAGE_SHELF = 's3://czbiohub-infectious-disease/references/taxid-lineages.db'

# input files
ACCESSION_ANNOTATED_FASTA = 'taxids.rapsearch2.filter.deuterostomes.taxids.gsnapl.unmapped.bowtie2.lzw.cdhitdup.priceseqfilter.unmapped.star.fasta'

# output files
TAXID_ANNOT_FASTA = 'taxid_annot.fasta'
TAXID_ANNOT_SORTED_FASTA_NT = 'taxid_annot_sorted_nt.fasta'
TAXID_LOCATIONS_JSON_NT = 'taxid_locations_nt.json'
TAXID_ANNOT_SORTED_FASTA_NR = 'taxid_annot_sorted_nr.fasta'
TAXID_LOCATIONS_JSON_NR = 'taxid_locations_nr.json'
LOGS_OUT_BASENAME = 'postprocess-log'

# processing functions
def accession2taxid(read_id, accession2taxid_dict, hit_type, lineage_map):
    accid_short = ((read_id.split(hit_type+':'))[1].split(":")[0]).split(".")[0]
    taxid = accession2taxid_dict.get(accid_short, "NA")
    species_taxid, genus_taxid, family_taxid = lineage_map.get(taxid, ("-1", "-2", "-3"))
    return species_taxid, genus_taxid, family_taxid

def generate_taxid_fasta_from_accid(input_fasta_file, accession2taxid_path, lineagePath, output_fasta_file):
    accession2taxid_dict = shelve.open(accession2taxid_path)
    lineage_map = shelve.open(lineagePath)
    input_fasta_f = open(input_fasta_file, 'rb')
    output_fasta_f = open(output_fasta_file, 'wb')
    sequence_name = input_fasta_f.readline()
    sequence_data = input_fasta_f.readline()
    while len(sequence_name) > 0 and len(sequence_data) > 0:
        read_id = sequence_name.rstrip().lstrip('>') # example read_id: "NR::NT:CP010376.2:NB501961:14:HM7TLBGX2:1:23109:12720:8743/2"
        nr_taxid_species, nr_taxid_genus, nr_taxid_family = accession2taxid(read_id, accession2taxid_dict, 'NR', lineage_map)
        nt_taxid_species, nt_taxid_genus, nt_taxid_family = accession2taxid(read_id, accession2taxid_dict, 'NT', lineage_map)
        new_read_name = ('nr:' + nr_taxid_species + ':nt:' + nt_taxid_species
                         + ':' + read_id)
        output_fasta_f.write(">%s\n" % new_read_name)
        output_fasta_f.write(sequence_data)
        sequence_name = input_fasta_f.readline()
        sequence_data = input_fasta_f.readline()
    input_fasta_f.close()
    output_fasta_f.close()

def get_taxid(sequence_name, taxid_field):
    parts = sequence_name.split(":")
    if len(parts) < taxid_field-1:
         return 'none'
    return parts[taxid_field-1]

def generate_taxid_locator(input_fasta, taxid_field, output_fasta, output_json):
    # put every 2-line fasta record on a single line with delimiter ":lineseparator:":
    command = "awk 'NR % 2 == 1 { o=$0 ; next } { print o \":lineseparator:\" $0 }' %s" % input_fasta
    # sort the records based on the field containing the taxids:
    command += " | sort --key %s --field-separator ':' --numeric-sort" % taxid_field
    # split every record back over 2 lines:
    command += " | sed 's/:lineseparator:/\n/g' > %s" % output_fasta
    # TO DO: TEST IF COMMAND GIVES EXPECTED RESULTS
    subprocess.check_output(command, shell=True)
    # make json giving byte range of file corresponding to each taxid:
    taxon_sequence_locations = []
    f = open(output_fasta, 'rb')
    sequence_name = f.readline()
    sequence_data = f.readline()
    taxid = get_taxid(sequence_name, taxid_field)
    first_byte = 0
    new_first_byte = len(sequence_name) + len(sequence_data)
    while len(sequence_name) > 0 and len(sequence_data) > 0:
        sequence_name = f.readline()
        sequence_data = f.readline()
        new_taxid = get_taxid(sequence_name, taxid_field)
        if new_taxid != taxid:
            taxon_sequence_locations.append({'taxid': taxid, 'first_byte': first_byte,
                                             'last_byte': new_first_byte - 1})
            taxid = new_taxid.copy
            first_byte = new_first_byte.copy
            new_first_byte = len(sequence_name) + len(sequence_data)
        else:
            new_first_byte += len(sequence_name) + len(sequence_data)
    f.close()
    with open(output_json, 'wb') as f:
       json.dump(taxon_sequence_locations, f)

# job functions
def execute_command(command):
    print command
    output = subprocess.check_output(command, shell=True)
    return output

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

def run_and_log(logparams, func_name, *args):
    logger = logging.getLogger()
    logger.info("========== %s ==========" % logparams.get("title"))
    # produce the output
    func_return = func_name(*args)
    if func_return == 1:
        logger.info("output exists, lazy run")
    else:
        logger.info("uploaded output")
    # copy log file
    execute_command("aws s3 cp %s %s/;" % (logger.handlers[0].baseFilename, logparams["sample_s3_output_path"]))

def run_generate_taxid_fasta_from_accid(input_fasta, accession2taxid_s3_path, lineage_s3_path,
    output_fasta, result_dir, sample_s3_output_path, lazy_run):
    if lazy_run:
        # check if output already exists
        if os.path.isfile(output_fasta):
            return 1
    accession2taxid_gz = os.path.basename(accession2taxid_s3_path)
    accession2taxid_path = REF_DIR + '/' + accession2taxid_gz[:-3]
    if not os.path.isfile(accession2taxid_path):
        execute_command("aws s3 cp %s %s/" % (accession2taxid_s3_path, REF_DIR))
        execute_command("cd %s; gunzip %s" % (REF_DIR, accession2taxid_gz))
        logging.getLogger().info("downloaded accession-to-taxid map")
    lineage_filename = os.path.basename(lineage_s3_path)
    lineage_path = REF_DIR + '/' + lineage_filename
    if not os.path.isfile(lineage_path):
        execute_command("aws s3 cp %s %s/" % (lineage_s3_path, REF_DIR))
        logging.getLogger().info("downloaded taxid-lineage shelf")
    generate_taxid_fasta_from_accid(input_fasta, accession2taxid_path, lineage_path, output_fasta)
    logging.getLogger().info("finished job")
    execute_command("aws s3 cp %s %s/" % (output_fasta, sample_s3_output_path))

def run_generate_taxid_locator(input_fasta, taxid_field, output_fasta, output_json,
    result_dir, sample_s3_output_path, lazy_run):
    if lazy_run:
        # check if output already exists
        if os.path.isfile(output_fasta):
            return 1
    generate_taxid_locator(input_fasta, taxid_field, output_fasta, output_json)
    logging.getLogger().info("finished job")
    execute_command("aws s3 cp %s %s/" % (output_fasta, sample_s3_output_path))
    execute_command("aws s3 cp %s %s/" % (output_json, sample_s3_output_path))

def run_sample(sample_s3_input_path, sample_s3_output_path, aws_batch_job_id, lazy_run = True):

    sample_s3_output_path = sample_s3_output_path.rstrip('/')
    sample_name = sample_s3_input_path[5:].rstrip('/').replace('/','-')
    sample_dir = DEST_DIR + '/' + sample_name
    input_dir = sample_dir + '/inputs'
    result_dir = sample_dir + '/results'
    scratch_dir = sample_dir + '/scratch'
    execute_command("mkdir -p %s %s %s" % (sample_dir, input_dir, result_dir, scratch_dir))
    execute_command("mkdir -p %s " % REF_DIR);

    # configure logger
    log_file = "%s/%s-%s.txt" % (result_dir, LOGS_OUT_BASENAME, aws_batch_job_id)
    logger = logging.getLogger()
    logger.setLevel(logging.INFO)
    handler = logging.FileHandler(log_file)
    formatter = logging.Formatter("%(asctime)s (%(time_since_last)ss elapsed): %(message)s")
    handler.addFilter(TimeFilter())
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    DEFAULT_LOGPARAMS = {"sample_s3_output_path": sample_s3_output_path}

    # download input
    execute_command("aws s3 cp %s/%s %s/" % (sample_s3_input_path, ACCESSION_ANNOTATED_FASTA, input_dir))
    input_file = os.path.join(input_dir, ACCESSION_ANNOTATED_FASTA)

    if lazy_run:
       # Download existing data and see what has been done
        command = "aws s3 cp %s %s --recursive" % (sample_s3_output_path, result_dir)
        print execute_command(command)

    # generate taxid fasta
    logparams = return_merged_dict(DEFAULT_LOGPARAMS,
        {"title": "run_generate_taxid_fasta_from_accid"})
    run_and_log(logparams, run_generate_taxid_fasta_from_accid,
        input_file, ACCESSION2TAXID, LINEAGE_SHELF,
        os.path.join(result_dir, TAXID_ANNOT_FASTA),
        result_dir, sample_s3_output_path, False)

    # generate taxid locator for NT
    logparams = return_merged_dict(DEFAULT_LOGPARAMS,
        {"title": "run_generate_taxid_locator for NT"})
    run_and_log(logparams, run_generate_taxid_locator,
        os.path.join(result_dir, TAXID_ANNOT_FASTA), 4,
        os.path.join(result_dir, TAXID_ANNOT_SORTED_FASTA_NT),
        os.path.join(result_dir, TAXID_LOCATIONS_JSON_NT),
        result_dir, sample_s3_output_path, False)

    # generate taxid locator for NR
    logparams = return_merged_dict(DEFAULT_LOGPARAMS,
        {"title": "run_generate_taxid_locator for NR"})
    run_and_log(logparams, run_generate_taxid_locator,
        os.path.join(result_dir, TAXID_ANNOT_FASTA), 2,
        os.path.join(result_dir, TAXID_ANNOT_SORTED_FASTA_NR),
        os.path.join(result_dir, TAXID_LOCATIONS_JSON_NR),
        result_dir, sample_s3_output_path, False)

# Main
def main():
    global INPUT_BUCKET
    global OUTPUT_BUCKET
    INPUT_BUCKET = os.environ.get('INPUT_BUCKET', INPUT_BUCKET)
    OUTPUT_BUCKET = os.environ.get('OUTPUT_BUCKET', OUTPUT_BUCKET)
    AWS_BATCH_JOB_ID = os.environ.get('AWS_BATCH_JOB_ID', 'local')
    sample_s3_input_path = INPUT_BUCKET.rstrip('/')
    sample_s3_output_path = OUTPUT_BUCKET.rstrip('/')

    run_sample(sample_s3_input_path, sample_s3_output_path, AWS_BATCH_JOB_ID, True)

if __name__=="__main__":
    main()
