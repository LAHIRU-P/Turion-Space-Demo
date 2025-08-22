# Turion-Space-Demo

## Tools and Services Chosen 
### CI/CD Platform: Jenkins
My choice to use Jenkins came from my extensive experience over the past few years deploying and administrating it in my current role. I mostly prefer Jenkins because of its vast flexibility with plugins, allowing me to tailor each deployment to my specific use case. Due to the time constraints of this demo, I opted to deploy the primary Jenkins server on a t3.small EC2 instance using a prebuilt AMI from the AWS Marketplace. This instance still required a few modifications, primarily updates to the base OS and many Jenkins plugins before it was fully functional.

### IaC Tool: AWS CDK
My choice to use CDK was both a personal challenge to work with an IaC tool that was new to me and an opportunity to see how well I could keep my entire project within AWS using their tools. There's no question that this took up the bulk of my time as I worked through the project, but after overcoming the initial hurdles of understanding the file and folder structure of a CDK app, it became much clearer to me. Additionally, combining the execution of the CDK code via a Jenkins build gave me a smooth workflow that I am most proud of from this project.

### Managed Kubernetes Environment: AWS EKS
Similarly to my choice to use AWS CDK to stay within the AWS ecosystem, I also chose to use AWS's EKS service to deploy the cluster. Another key reason I wanted to use the EKS environment was the ability to easily manage permissions with IAM roles for the EC2 instances that run the application.

## CI/CD Pipeline Flow 
1. Source code changes are made and pushed to GitHub.
2. Jenkins agent detects the change via webhook.
3. Build is passed to the Jenkins build agent that reads the Jenkinsfile and runs each stage:
    1. Code is checked out into the workspace.
    2. Docker build is executed using the Dockerfile that defines the demo webapp.
    3. The container is tested by running it and curling the health check endpoint.
    4. The built image is pushed to Docker Hub and tagged with the last 7 characters of the git hash for easy traceability.
    5. The EKS environment to deploy to is checked.
    6. Configuration YAML files are applied to the cluster.
    7. The new image is deployed to the cluster.
    8. The DNS endpoint is retrieved from the load balancer to be accessed from the web.

NOTE: If time permitted for me to impliment the strech goal of adding Argo CD the pipeline would be modified where Jenkins would stop its process after successfully building and pushing the Docker image to the repository. Argo CD would then take over the responsibility of updating the Kubernetes manifests and automating the deployment based on the Git repository state. 

## Provisioning the stack using IaC
My goal with this project was to make infrastructure changes easy to automate rather than run by hand. I can deploy the stack with the CDK CLI, but I intentionally wired the same flow into a separate and manually triggered Jenkins job. This improves speed, reduces typos, and makes the process auditable.

### Deploying with the Jenkins Job
Trigger the **`Jenkinsfile_infra`** pipeline, which performs the same steps non‑interactively in CI. I opted to set this as manually triggred pipeline in Jenkins as not every push to the repo will require this to be run. In a production enviroment I would sepperate the CDK deployments into a sepperate repo and possiably paramaeterize the Jenkins buils where regions and other cluster options that change frequently can be specified at the time the pipeline is built. 

### `Jenkinsfile_infra` (Infrastructure Pipeline Flow)
Goal: Provision or update the VPC + EKS cluster using AWS CDK from Jenkins, without manual CLI steps.

1. Code is checked out into the workspace.
2. Install CDK dependencies – `npm ci` inside `k8-cdk-deploy/`.
3. Synthesize – `npx cdk synth` to validate and build the CloudFormation template.
4. Deploy – `npx cdk deploy --require-approval never --outputs-file ../cdk-outputs.json` to create/update the stack.
5. Write kubeconfig & sanity‑check – Uses `aws eks update-kubeconfig` with the cluster name from `cdk-outputs.json`, then runs `kubectl get nodes`.
6. Prints the cluster name/stack ARN so the application pipeline can target the correct cluster.

**Prerequisites on the Jenkins agent:**
- AWS credentials/role with permission to assume the CDK bootstrap roles and `eks:DescribeCluster`.
- AWS CDK bootstrapped once in the account/region (`cdk bootstrap`).
- Tools installed: Node.js + npm, AWS CLI, and `kubectl`.

## Security Measures
When designing the security aspects of this project, I focused on balancing best practices with the constraints of time and scope. I carefully assigned IAM roles to the EC2 instances and Jenkins agents to ensure they had only the permissions necessary for their tasks, avoiding overly privilaged policies. To keep the environment clean and manageable, I separated the CDK bootstrap resources from the main application stack, which helped isolate permissions and reduce risk. The VPC was designed with both public and private subnets, ensuring that sensitive components like the EKS nodes remained safe from direct internet access while still allowing necessary communication. For Jenkins, I used its credential management system to securely handle secrets and tokens rather than hardcoding them, which felt like a practical and secure approach given the demo’s scope and my limited time. And of course also due to the time crunch some advanced security measures such as network policies within Kubernetes and automated secret rotation were left out, these are key areas I would prioritize if this project moved beyond a proof of concept.

## Plan For Managing kubectl Access
Reflecting on managing access to the Kubernetes cluster, I would recommend using Kubernetes namespaces unique to each developer. This approach allows us to enforce RBAC policies so that each developer only has access to their own namespace, limiting the risk of accidental changes. For third parties who many need visibility into the cluster but shouldn’t modify resources, a shared read-only namespace could be provided. This way, they can monitor and audit without risking unintended changes. At the same time, only one or two administrators would hold full cluster-wide access to manage the overall environment, keeping control tightly scoped while enabling safe collaboration. I belive this strategy strikes a good balance between security and flexibility, which is especially important as the team and resource usages scale.

## Next Steps for Production Readiness
Given more time, my immediate focus would be integrating Argo CD to establish a true GitOps workflow. This would streamline deployments and improve traceability by having Kubernetes manifests continuously updated based on the Git repository state. I would also move all sensitive information like database credentials and API keys into AWS Secrets Manager, another tool that would be new to me but a fun challange to learn and impliment. This would reduce the risk of exposure and simplifying secret management. To improve cluster health visibility, I’d add Prometheus and Grafana for detailed metrics collection and visualization possiably alongside CloudWatch for logging and email alerting. Reguadless, this assignment as been a great challange exposing me to more tools and services that I was not familiar with and acting as a great learning experiance over this week. I still plan to push to impliment some of the screch goals over the week before my AWS credits run out and ill be including any code changes past this initial dealine into a new branch. 


