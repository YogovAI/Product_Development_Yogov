from fastapi import APIRouter, HTTPException
import subprocess
import os
import time
from pydantic import BaseModel
from typing import List, Dict

router = APIRouter(prefix="/cluster", tags=["cluster"])

# Configuration for VMware VMs
VM_PATHS = {
    "master": "/mnt/daas/multinode_cluster/master/master.vmx",
    "worker1": "/mnt/daas/multinode_cluster/worker1/worker1.vmx",
    "worker2": "/mnt/daas/multinode_cluster/worker2/worker2.vmx",
}

GUEST_USER = "hduser"
GUEST_PASS = "hadoop"

class ServiceAction(BaseModel):
    service: str  # 'hadoop', 'spark', 'spark-connect', 'timescaledb', 'minio'
    action: str   # 'start', 'stop', 'status'

class VmPowerAction(BaseModel):
    node: str  # 'master', 'worker1', 'worker2', 'all'
    action: str # 'start', 'stop'

def run_vm_command(cmd_args: List[str]):
    try:
        process = subprocess.Popen(cmd_args, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        stdout, stderr = process.communicate()
        if process.returncode != 0:
            error_msg = f"Command failed with code {process.returncode}. Stderr: {stderr.strip()} Stdout: {stdout.strip()}"
            return process.returncode, stdout, error_msg
        return process.returncode, stdout, stderr
    except Exception as e:
        return -1, "", str(e)

@router.post("/power")
async def manage_vm_power(action: VmPowerAction):
    nodes = [action.node] if action.node != "all" else ["master", "worker1", "worker2"]
    results = []
    
    for node in nodes:
        if node not in VM_PATHS:
            continue
        
        vm_path = VM_PATHS[node]
        if action.action == "start":
            cmd = ["vmrun", "-T", "ws", "start", vm_path, "gui"]
        else:
            cmd = ["vmrun", "-T", "ws", "stop", vm_path, "soft"]
            
        rc, out, err = run_vm_command(cmd)
        results.append({"node": node, "success": rc == 0, "error": err if rc != 0 else None})
    
    return {"results": results}

@router.post("/manage")
async def manage_service(action: ServiceAction):
    # All commands are executed on the master node
    master_vm = VM_PATHS["master"]
    
    command = ""
    if action.service == "hadoop":
        if action.action == "start":
            command = "export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64; export HADOOP_HOME=/usr/local/hadoop; /usr/local/hadoop/sbin/start-all.sh"
        elif action.action == "stop":
            command = "export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64; export HADOOP_HOME=/usr/local/hadoop; /usr/local/hadoop/sbin/stop-all.sh"
            
    elif action.service == "spark":
        if action.action == "start":
            command = "export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64; export SPARK_HOME=/usr/local/spark; /usr/local/spark/sbin/start-all.sh"
        elif action.action == "stop":
            command = "export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64; export SPARK_HOME=/usr/local/spark; /usr/local/spark/sbin/stop-all.sh"

    elif action.service == "spark-connect":
        if action.action == "start":
            command = "export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64; export SPARK_HOME=/usr/local/spark; /usr/local/spark/sbin/start-connect-server.sh --packages org.apache.spark:spark-connect_2.12:3.5.0"
        elif action.action == "stop":
            command = "pkill -f SparkConnectServer"

    elif action.service == "minio":
        if action.action == "start":
            # Run native minio command in background
            cmd = ["nohup", "minio", "server", "/mnt/daas/minio", "--address", "0.0.0.0:9700", "--console-address", ":9701", "&"]
            # Use shell=True for & and nohup
            try:
                subprocess.Popen(" ".join(cmd), shell=True, preexec_fn=os.setpgrp)
                return {"status": "success", "message": "MinIO started natively"}
            except Exception as e:
                return {"status": "error", "message": str(e)}
        elif action.action == "stop":
            rc, out, err = run_vm_command(["pkill", "-f", "minio server"])
            return {"status": "success" if rc in [0, 1] else "error", "message": "MinIO stopped", "output": out, "error": err}

    elif action.service in ["timescaledb", "airflow", "prefect", "mage"]:
        # Docker commands run on the host
        docker_cmd = ["docker", "compose", action.action if action.action != "start" else "up", "-d"]
        if action.action == "stop": docker_cmd = ["docker", "compose", "stop", action.service]
        elif action.action == "start": docker_cmd = ["docker", "compose", "up", "-d", action.service]
        
        rc, out, err = run_vm_command(docker_cmd)
        return {
            "status": "success" if rc == 0 else "error",
            "message": f"Executed docker command for {action.service}",
            "output": out,
            "error": err
        }

    if not command:
        if action.action == "status":
             # We reuse the jps logic below
             pass
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported service or action: {action.service}/{action.action}")

    # Use vmrun to run program in guest
    # Using /bin/bash -l -c ensures environment variables like $SPARK_HOME and PATH are loaded
    exec_cmd = [
        "vmrun", "-T", "ws", 
        "-gu", GUEST_USER, "-gp", GUEST_PASS, 
        "runProgramInGuest", master_vm, 
        "/bin/bash", "-l", "-c", command
    ]
    
    rc, out, err = run_vm_command(exec_cmd)
    
    return {
        "status": "success" if rc == 0 else "error",
        "message": f"Executed '{command}' on master node",
        "output": out,
        "error": err
    }

@router.get("/status")
async def get_cluster_status():
    master_vm = VM_PATHS["master"]
    
    # Check if VM is even running first
    rc, list_out, _ = run_vm_command(["vmrun", "list"])
    is_master_on = master_vm in list_out
    
    services = []
    
    # Only check guest services if master is on
    if is_master_on:
        exec_cmd = [
            "vmrun", "-T", "ws", 
            "-gu", GUEST_USER, "-gp", GUEST_PASS, 
            "listProcessesInGuest", master_vm
        ]
        
        rc, out, _ = run_vm_command(exec_cmd)
        if rc == 0:
            if "NameNode" in out: services.append("NameNode")
            if "DataNode" in out: services.append("DataNode")
            if "ResourceManager" in out: services.append("ResourceManager")
            if "NodeManager" in out: services.append("NodeManager")
            if "Master" in out: services.append("Master")
            if "Worker" in out: services.append("Worker")
            if "SparkConnectServer" in out: services.append("SparkConnectServer")
    
    # Check Docker services (always check host)
    try:
        docker_rc, docker_out, _ = run_vm_command(["docker", "compose", "ps", "--format", "json"])
        if docker_rc == 0 and docker_out.strip():
            import json
            try:
                ps_data = json.loads(docker_out)
                if not isinstance(ps_data, list): ps_data = [ps_data]
                for container in ps_data:
                    if container.get("State") == "running" or container.get("Status", "").lower().startswith("up"):
                        services.append(f"Docker:{container.get('Name')}")
            except:
                for line in docker_out.strip().split('\n'):
                    try:
                        container = json.loads(line)
                        if container.get("State") == "running" or container.get("Status", "").lower().startswith("up"):
                            services.append(f"Docker:{container.get('Name')}")
                    except: continue
    except:
        pass

    # Check for native MinIO process (always check host)
    try:
        minio_rc, minio_out, _ = run_vm_command(["pgrep", "-f", "minio server"])
        if minio_rc == 0:
            services.append("Native:minio")
    except:
        pass

    return {
        "vm_status": "online" if is_master_on else "offline",
        "services": services,
        "running_vms": [node for node, path in VM_PATHS.items() if path in list_out]
    }
