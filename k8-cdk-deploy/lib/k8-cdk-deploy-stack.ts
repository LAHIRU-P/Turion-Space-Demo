import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2'; 
import * as eks from 'aws-cdk-lib/aws-eks';
import * as iam from 'aws-cdk-lib/aws-iam';
import { KubectlV30Layer } from '@aws-cdk/lambda-layer-kubectl-v30';


// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class K8CdkDeployStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Define my VPC
    const vpc = new ec2.Vpc(this, 'EksVpc', {
      maxAzs: 2,            // 2 availability zone for fault tolerance
      natGateways: 1,       // 2 would be ideal but will get expensive 
      subnetConfiguration: [
        { name: 'public',  subnetType: ec2.SubnetType.PUBLIC }, //for use with ALB and exposing webapp online
        { name: 'private', subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }, //for use within the k8 for nodes and services
      ],
    });

    // Define the control plane of the cluster
    const cluster = new eks.Cluster(this, 'WebAppCluster', {
      version: eks.KubernetesVersion.V1_30,   // using recomended version from guides
      vpc,
      defaultCapacity: 0,      
      endpointAccess: eks.EndpointAccess.PUBLIC_AND_PRIVATE,
      authenticationMode: eks.AuthenticationMode.API_AND_CONFIG_MAP, 
      kubectlLayer: new KubectlV30Layer(this, 'KubectlV30Layer')
    });

    // Define worker noded in cluster
    cluster.addNodegroupCapacity('MyNodes', {
      desiredSize: 2,
      minSize: 2,
      maxSize: 4,
      instanceTypes: [new ec2.InstanceType('t3.large')],
      subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
    });

    // Setup Jenkins agent role for Kubernetes access via EKS Access Entry
    const agentRoleArn = process.env.JENKINS_AGENT_ROLE_ARN ?? '';
    if (agentRoleArn) {
      new eks.AccessEntry(this, 'AgentAccess', {
        cluster,
        principal: agentRoleArn,
        accessPolicies: [
          eks.AccessPolicy.fromAccessPolicyName(
          'AmazonEKSClusterAdminPolicy',
          { accessScopeType: eks.AccessScopeType.CLUSTER }
          ),
        ],
      });
    }

    // Define AWS load balancer 
    new eks.AlbController(this, 'AlbController', {
      cluster,
      version: eks.AlbControllerVersion.V2_7_1,
    });

    // Set a friendly name in CloudFormation output
    new cdk.CfnOutput(this, 'TurionSpaceDemo', { value: cluster.clusterName });   

  }
}
