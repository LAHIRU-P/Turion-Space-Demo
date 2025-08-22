pipeline {
  agent { label 'ec2-builder' }

  environment {
    //Deployable Image Name
    DOCKERHUB_REPO = 'lahiru97/turion-space-demo'
    // Tag each built image with last 7 of git hash
    IMAGE_TAG = "${env.GIT_COMMIT.take(7)}"
    // Text set by this environment variable is added to webapp page
    APP_MESSAGE = "Hello from Jenkins build #${env.BUILD_NUMBER}"

    // EKS cluster deploy settings
    REGION      = 'us-east-2'
    CLUSTER_NAME = 'WebAppCluster8DE5E23C-4fa9a5bad18148c09e1d365d09ff30ae'
    NAMESPACE   = 'demo'
    APP_NAME    = 'turion-space-demo'
  }

  triggers { githubPush() }
  options { timestamps() }

  stages {
    stage('Git Checkout') {
      steps { checkout scm }
    }

    stage('Build Webapp Container') {
      steps {
        sh '''
          docker build -t $DOCKERHUB_REPO:$IMAGE_TAG .
        '''
      }
    }

    stage('Test Container') {
      steps {
        sh '''
          docker run -d --rm --name apptest -e APP_MESSAGE="$APP_MESSAGE" -p 8080:8080 $DOCKERHUB_REPO:$IMAGE_TAG
          # Wait for webapp to start before checking reported health
          sleep 2
          # Hit web app heath check 
          curl -fsS http://localhost:8080/healthz
          docker rm -f apptest
        '''
      }
    }

    stage('Push To Dockerhub') {
      when { branch 'main' }} //Only push main branch builds
      steps {
        withCredentials([usernamePassword(credentialsId: 'DockerHub-Credentials', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
          sh '''
            echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin
            docker push $DOCKERHUB_REPO:$IMAGE_TAG
          '''
        }
      }
    }

    stage('Configure kubectl for EKS') {
      steps {
        sh '''
          aws eks update-kubeconfig --region "$REGION" --name "$CLUSTER_NAME"
          kubectl get nodes || true
        '''
      }
    }

    stage('Apply Namespace & Services') {
      steps {
        sh '''
          kubectl apply -f k8s/namespace.yaml
          kubectl apply -f k8s/service.yaml

          # Check if deployment is not set and run if needed 
          if ! kubectl -n "$NAMESPACE" get deploy "$APP_NAME" >/dev/null 2>&1; then
            kubectl apply -f k8s/deployment.yaml
          fi
        '''
      }
    }

    stage('Deploy Image to EKS') {
      steps {
        sh '''
          # Point the deployment to new image and check status
          kubectl -n "$NAMESPACE" set image deploy/"$APP_NAME" "$APP_NAME"="$DOCKERHUB_REPO":"$IMAGE_TAG"
          kubectl -n "$NAMESPACE" rollout status deploy/"$APP_NAME"
        '''
      }
    }

    stage('Show Final Endpoint') {
      steps {
        sh '''
          echo "Service external hostname:"
          kubectl -n "$NAMESPACE" get svc "$APP_NAME" -o jsonpath='{.status.loadBalancer.ingress[0].hostname}{"\n"}' || true
        '''
      }
    }
  }

  post {
    always {
      sh 'docker logout || true'
    }
  }
}