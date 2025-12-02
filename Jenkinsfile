pipeline {
  agent any

  parameters {
    choice(name: 'REGISTRY_MODE', choices: ['none','registry','kind'], description: 'How to make built images available to the cluster')
    string(name: 'REGISTRY_URL', defaultValue: 'localhost:5000', description: 'Docker registry URL when using registry mode')
    string(name: 'BACKEND_IMAGE', defaultValue: 'chatapp-backend:latest', description: 'Backend image name:tag')
    string(name: 'FRONTEND_IMAGE', defaultValue: 'chatapp-frontend:latest', description: 'Frontend image name:tag')
    string(name: 'KIND_CLUSTER_NAME', defaultValue: 'kind', description: 'Kind cluster name (when using kind)')
    string(name: 'K8S_MANIFEST_DIR', defaultValue: 'k8s', description: 'Path to k8s manifests')
  }

  environment {
    // These environment vars are defaults; prefer parameters when triggering pipeline.
    BACKEND_IMAGE = '${params.BACKEND_IMAGE}'
    FRONTEND_IMAGE = '${params.FRONTEND_IMAGE}'
    REGISTRY_MODE = '${params.REGISTRY_MODE}'
    REGISTRY_URL = '${params.REGISTRY_URL}'
    KIND_CLUSTER_NAME = '${params.KIND_CLUSTER_NAME}'
    K8S_MANIFEST_DIR = '${params.K8S_MANIFEST_DIR}'
  }

  options {
    timeout(time: 60, unit: 'MINUTES')
    buildDiscarder(logRotator(numToKeepStr: '20'))
  }

  stages {
    stage('Checkout') {
      steps { checkout scm }
    }

    stage('Install & Test') {
      parallel {
        stage('Backend: Install & Test') {
          steps {
            dir('backend') {
              sh 'if [ -f package.json ]; then npm ci || npm install; fi'
              sh 'if [ -f package.json ] && [ -d test ]; then npm test || true; fi'
            }
          }
        }
        stage('Frontend: Install & Test') {
          steps {
            dir('frontend') {
              sh 'if [ -f package.json ]; then npm ci || npm install; fi'
              sh 'if [ -f package.json ] && [ -d test ]; then npm test || true; fi'
            }
          }
        }
      }
    }

    stage('Build Images') {
      steps {
        script {
          echo "Building backend image: ${env.BACKEND_IMAGE}"
          sh "docker build -t ${env.BACKEND_IMAGE} -f backend/Dockerfile ."

          echo "Building frontend image: ${env.FRONTEND_IMAGE}"
          sh "docker build -t ${env.FRONTEND_IMAGE} -f frontend/Dockerfile frontend"
        }
      }
    }

    stage('Publish / Load Images') {
      steps {
        script {
          if (env.REGISTRY_MODE == 'registry') {
            echo "Using registry mode: ${env.REGISTRY_URL}"
            // Expect a Jenkins usernamePassword credential with id 'docker-registry-credentials'
            withCredentials([usernamePassword(credentialsId: 'docker-registry-credentials', usernameVariable: 'REG_USER', passwordVariable: 'REG_PASS')]) {
              sh "echo $REG_PASS | docker login ${env.REGISTRY_URL} -u $REG_USER --password-stdin"
              sh "docker tag ${env.BACKEND_IMAGE} ${env.REGISTRY_URL}/${env.BACKEND_IMAGE}"
              sh "docker tag ${env.FRONTEND_IMAGE} ${env.REGISTRY_URL}/${env.FRONTEND_IMAGE}"
              sh "docker push ${env.REGISTRY_URL}/${env.BACKEND_IMAGE}"
              sh "docker push ${env.REGISTRY_URL}/${env.FRONTEND_IMAGE}"
            }
          } else if (env.REGISTRY_MODE == 'kind') {
            echo "Using kind mode (load images into kind cluster ${env.KIND_CLUSTER_NAME})"
            sh "kind load docker-image ${env.BACKEND_IMAGE} --name ${env.KIND_CLUSTER_NAME} || true"
            sh "kind load docker-image ${env.FRONTEND_IMAGE} --name ${env.KIND_CLUSTER_NAME} || true"
          } else {
            echo 'No publish step; assuming cluster can access local Docker images.'
          }
        }
      }
    }

    stage('Deploy to Kubernetes') {
      steps {
        script {
          // Support optional kubeconfig file credential with id 'kubeconfig' (type: Secret file)
          def deployCmds = [
            "kubectl apply -f ${env.K8S_MANIFEST_DIR}/pv-pvc.yaml || true",
            "kubectl apply -f ${env.K8S_MANIFEST_DIR}/mongo-deployment.yaml || true",
            "kubectl apply -f ${env.K8S_MANIFEST_DIR}/backend-deployment.yaml || true",
            "kubectl apply -f ${env.K8S_MANIFEST_DIR}/backend-service.yaml || true",
            "kubectl apply -f ${env.K8S_MANIFEST_DIR}/frontend-deployment.yaml || true",
            "kubectl apply -f ${env.K8S_MANIFEST_DIR}/frontend-service.yaml || true"
          ]

          if (fileExists('/run/secrets/kubernetes.io/serviceaccount/token')) {
            // Likely running in-cluster agent with kubectl access
            deployCmds.each { sh it }
          } else {
            // Try using a kubeconfig file credential, if configured in Jenkins
            try {
              withCredentials([file(credentialsId: 'kubeconfig', variable: 'KUBECONFIG_FILE')]) {
                deployCmds.each { sh "KUBECONFIG=$KUBECONFIG_FILE ${it}" }
              }
            } catch (err) {
              echo 'No kubeconfig credential found or apply failed. Attempting direct kubectl commands.'
              deployCmds.each { sh it }
            }
          }

          // Update images in deployments to point to registry images when applicable
          if (env.REGISTRY_MODE == 'registry') {
            sh "kubectl set image deployment/backend backend=${env.REGISTRY_URL}/${env.BACKEND_IMAGE} --record || true"
            sh "kubectl set image deployment/frontend frontend=${env.REGISTRY_URL}/${env.FRONTEND_IMAGE} --record || true"
          } else {
            sh "kubectl set image deployment/backend backend=${env.BACKEND_IMAGE} --record || true"
            sh "kubectl set image deployment/frontend frontend=${env.FRONTEND_IMAGE} --record || true"
          }
        }
      }
    }
  }

  post {
    success { echo 'Jenkins pipeline completed and deployment applied.' }
    failure { echo 'Pipeline failed — check console output for errors.' }
    always { archiveArtifacts artifacts: '**/target/*.jar, frontend/dist/**', allowEmptyArchive: true }
  }
}
