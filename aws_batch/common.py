import time
import datetime
import threading
import sys
import subprocess
import logging
import json

class Updater(object):

    def __init__(self, update_period, update_function):
        self.update_period = update_period
        self.update_function = update_function
        self.timer_thread = None
        self.t_start = time.time()

    def relaunch(self, initial_launch=False):
        if self.timer_thread and not initial_launch:
            t_elapsed = time.time() - self.t_start
            self.update_function(t_elapsed)
        self.timer_thread = threading.Timer(self.update_period, self.relaunch)
        self.timer_thread.start()

    def __enter__(self):
        self.relaunch(initial_launch=True)
        return self

    def __exit__(self, *args):
        self.timer_thread.cancel()


class CommandTracker(Updater):

    lock = threading.RLock()
    count = 0

    def __init__(self, update_period=15):
        super(CommandTracker, self).__init__(update_period, self.print_update)
        with CommandTracker.lock:
            self.id = CommandTracker.count
            CommandTracker.count += 1

    def print_update(self, t_elapsed):
        print "Command %d still running after %3.1f seconds." % (self.id, t_elapsed)
        sys.stdout.flush()


class ProgressFile(object):

    def __init__(self, progress_file):
        self.progress_file = progress_file
        self.tail_subproc = None

    def __enter__(self):
        # TODO:  Do something else here. Tail gets confused if the file pre-exists.  Also need to rate-limit.
        if self.progress_file:
            self.tail_subproc = subprocess.Popen("touch {pf} ; tail -f {pf}".format(pf=self.progress_file), shell=True)
        return self

    def __exit__(self, *args):
        if self.tail_subproc:
            self.tail_subproc.kill()


def execute_command_with_output(command, progress_file=None):
    with CommandTracker() as ct:
        print "Command {}: {}".format(ct.id, command)
        with ProgressFile(progress_file):
            return subprocess.check_output(command, shell=True)


def execute_command_realtime_stdout(command, progress_file=None):
    with CommandTracker() as ct:
        print "Command {}: {}".format(ct.id, command)
        with ProgressFile(progress_file):
            subprocess.check_call(command, shell=True)


def execute_command(command, progress_file=None):
    execute_command_realtime_stdout(command, progress_file)

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

def percent_str(percent):
    try:
        return "%3.1f" % percent
    except:
        return str(percent)

def count_reads(file_name, file_type):
    count = 0
    if file_name[-3:] == '.gz':
        f = gzip.open(file_name)
    else:
        f = open(file_name)
    for line in f:
        if file_type == "fastq_paired":
            count += 2./4
        elif file_type == "fasta_paired":
            if line.startswith('>'):
                count += 2
        elif file_type == "fasta":
            if line.startswith('>'):
                count += 1
        elif file_type == "m8" and line[0] == '#':
            continue
        else:
            count += 1
    f.close()
    return int(count)

def return_merged_dict(dict1, dict2):
    result = dict1.copy()
    result.update(dict2)
    return result

def run_and_log(logparams, target_outputs, lazy_run, func_name, *args):
    logger = logging.getLogger()
    logger.info("========== %s ==========" % logparams.get("title"))
    # copy log file -- start
    logger.handlers[0].flush()
    execute_command("aws s3 cp %s %s/;" % (logger.handlers[0].baseFilename, logparams["sample_s3_output_path"]))
    # produce the output
    if lazy_run and all(os.path.isfile(output) for output in target_outputs):
        logger.info("output exists, lazy run")
    else:
        func_name(*args)
        logger.info("uploaded output")
    # copy log file -- after work is done
    execute_command("aws s3 cp %s %s/;" % (logger.handlers[0].baseFilename, logparams["sample_s3_output_path"]))
    # count records
    required_params = ["before_file_name", "before_file_type", "after_file_name", "after_file_type"]
    if logparams["count_reads"] and all(param in logparams for param in required_params):
        records_before = count_reads(logparams["before_file_name"], logparams["before_file_type"])
        records_after = count_reads(logparams["after_file_name"], logparams["after_file_type"])
        STATS.append({'task': func_name.__name__, 'reads_before': records_before, 'reads_after': records_after})
    # copy log file -- end
    logger.handlers[0].flush()
    execute_command("aws s3 cp %s %s/;" % (logger.handlers[0].baseFilename, logparams["sample_s3_output_path"]))
    # write stats
    stats_path = logparams["stats_file"]
    with open(stats_path, 'wb') as f:
        json.dump(STATS, f)
    execute_command("aws s3 cp %s %s/;" % (stats_path, logparams["sample_s3_output_path"]))
